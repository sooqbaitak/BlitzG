-- BLITZ Gaming loyalty earning-mode update. Non-destructive: replaces only the order RPC function.
-- Run in Supabase SQL Editor after deploying the matching frontend.

create or replace function public.blitz_create_order(p_order jsonb, p_points_to_spend integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state jsonb;
  v_products jsonb;
  v_coupons jsonb;
  v_line jsonb;
  v_product jsonb;
  v_variant jsonb;
  v_product_id text;
  v_variant_id text;
  v_qty integer;
  v_product_stock integer;
  v_variant_stock integer;
  v_base numeric;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_expected_unit numeric;
  v_area text;
  v_delivery numeric := 0;
  v_delivery_threshold numeric;
  v_delivery_discount numeric := 0;
  v_offer jsonb;
  v_offer_discount numeric := 0;
  v_offer_reward_discount numeric := 0;
  v_offer_required integer := 0;
  v_offer_present integer := 0;
  v_offer_original numeric := 0;
  v_offer_price numeric := 0;
  v_reward_rule jsonb;
  v_reward_id text;
  v_discount numeric := 0;
  v_customer_discount numeric := 0;
  v_customer_blocked boolean := false;
  v_personal_discount numeric := 0;
  v_eligible numeric := 0;
  v_coupon jsonb;
  v_code text;
  v_coupon_id text;
  v_limit integer;
  v_used integer;
  v_min numeric;
  v_targets_all boolean;
  v_item_eligible boolean;
  v_total numeric := 0;
  v_points_cost integer := 0;
  v_points_balance integer := 0;
  v_points_earned integer := 0;
  v_order_number text;
  v_order_id uuid := gen_random_uuid();
  v_redemption_id bigint;
  v_order jsonb;
  v_order_items jsonb;
  v_payment_method text;
  v_payment_status text;
  v_user_id uuid := auth.uid();
  v_phone text;
  v_now date := current_date;
begin
  select data into v_state from public.blitz_store_state where id = 'main' for update;
  if v_state is null or jsonb_typeof(v_state->'products') <> 'array' then
    raise exception 'Store is not initialized. Sign in as admin and save Store Settings first.';
  end if;
  v_products := v_state->'products';
  v_coupons := coalesce(v_state->'coupons', '[]'::jsonb);
  v_phone := coalesce(p_order->>'phone', '');
  v_payment_method := coalesce(nullif(p_order->>'payment',''), 'cod');
  if v_payment_method not in ('cod','card','bank_transfer') then
    raise exception 'This payment method has not been integrated. Choose Cash on Delivery, card, or bank transfer.';
  end if;
  if v_payment_method <> 'cod' and not exists (
    select 1 from jsonb_array_elements(coalesce(v_state->'store'->'paymentMethods','[]'::jsonb)) pm
    where pm->>'id' = v_payment_method and coalesce((pm->>'enabled')::boolean, false)
  ) then raise exception 'This payment method is not enabled by the store.'; end if;
  if v_payment_method = 'bank_transfer' and not (
    nullif(trim(v_state->'store'->'bankTransferDetails'->>'bankName'),'') is not null
    and nullif(trim(v_state->'store'->'bankTransferDetails'->>'accountHolder'),'') is not null
    and (nullif(trim(v_state->'store'->'bankTransferDetails'->>'iban'),'') is not null or nullif(trim(v_state->'store'->'bankTransferDetails'->>'accountNumber'),'') is not null)
  ) then raise exception 'The store has not configured complete bank-transfer details.'; end if;
  if v_payment_method = 'card' and nullif(trim(p_order->>'email'),'') is null then raise exception 'An email address is required for card checkout.'; end if;
  v_payment_status := case when v_payment_method = 'cod' then 'pay_on_delivery' when v_payment_method = 'bank_transfer' then 'awaiting_transfer' else 'awaiting_payment' end;
  if jsonb_typeof(p_order->'items') <> 'array' or jsonb_array_length(p_order->'items') = 0 then raise exception 'Your cart is empty.'; end if;

  -- Verify server prices, product status, quantity and current stock; then reserve/decrement them under the same row lock.
  for v_line in select value from jsonb_array_elements(p_order->'items') loop
    v_product_id := v_line->>'productId';
    v_variant_id := nullif(v_line->>'variantId', '');
    v_qty := greatest(0, coalesce((v_line->>'qty')::integer, 0));
    if v_qty < 1 then raise exception 'Invalid item quantity.'; end if;
    select value into v_product from jsonb_array_elements(v_products) where value->>'id' = v_product_id;
    if v_product is null or coalesce(v_product->>'status','active') <> 'active' then raise exception 'A product in your cart is no longer available.'; end if;
    v_base := coalesce(nullif(v_product->>'salePrice','')::numeric, (v_product->>'price')::numeric, 0);
    v_product_stock := coalesce((v_product->>'stock')::integer, 0);
    v_unit := v_base;
    if v_variant_id is not null then
      select value into v_variant from jsonb_array_elements(coalesce(v_product->'variants','[]'::jsonb)) where value->>'id' = v_variant_id;
      if v_variant is null then raise exception 'A selected product option no longer exists.'; end if;
      v_unit := v_base + coalesce((v_variant->>'priceDelta')::numeric, 0);
      v_variant_stock := coalesce((v_variant->>'stock')::integer, 0);
      if v_variant_stock < v_qty then raise exception 'A selected product option is out of stock.'; end if;
    elsif v_product_stock < v_qty then raise exception 'A product in your cart is out of stock.'; end if;
    v_expected_unit := coalesce((v_line->>'unitPrice')::numeric, -1);
    if abs(v_expected_unit - v_unit) > 0.02 then raise exception 'A product price changed. Refresh your cart and try again.'; end if;
    v_subtotal := v_subtotal + v_unit * v_qty;

    select coalesce(jsonb_agg(case when prod->>'id' = v_product_id then
      jsonb_set(
        jsonb_set(prod, '{stock}', to_jsonb(greatest(0, coalesce((prod->>'stock')::integer,0) - v_qty)), true),
        '{sold}', to_jsonb(coalesce((prod->>'sold')::integer,0) + v_qty), true
      ) || case when v_variant_id is not null then jsonb_build_object('variants', (
        select coalesce(jsonb_agg(case when vr->>'id' = v_variant_id then jsonb_set(vr, '{stock}', to_jsonb(greatest(0, coalesce((vr->>'stock')::integer,0) - v_qty)), true) else vr end), '[]'::jsonb)
        from jsonb_array_elements(coalesce(prod->'variants','[]'::jsonb)) vr
      )) else '{}'::jsonb end
    else prod end), '[]'::jsonb) into v_products from jsonb_array_elements(v_products) prod;
  end loop;
  if abs(v_subtotal - coalesce((p_order->>'productSubtotal')::numeric, -999)) > 0.02 then raise exception 'Cart subtotal changed. Refresh your cart.'; end if;

  v_area := p_order->>'area';
  if v_area = 'westbank' then v_delivery := coalesce((v_state->'delivery'->>'westbank')::numeric, 20);
  elsif v_area = 'jerusalem' then v_delivery := coalesce((v_state->'delivery'->>'jerusalem')::numeric, 50);
  elsif v_area = 'inside48' then v_delivery := coalesce((v_state->'delivery'->>'inside48')::numeric, 70);
  else
    select coalesce((a->>'fee')::numeric,0), nullif(a->>'freeDeliveryThreshold','')::numeric into v_delivery, v_delivery_threshold
      from jsonb_array_elements(coalesce(v_state->'delivery'->'additionalAreas','[]'::jsonb)) a
      where a->>'id' = v_area and coalesce((a->>'active')::boolean,true);
    if not found then raise exception 'Please choose a valid delivery area.'; end if;
  end if;
  if v_area = 'westbank' then v_delivery_threshold := nullif(v_state->'delivery'->>'westbankFreeDeliveryThreshold','')::numeric;
  elsif v_area = 'jerusalem' then v_delivery_threshold := nullif(v_state->'delivery'->>'jerusalemFreeDeliveryThreshold','')::numeric;
  elsif v_area = 'inside48' then v_delivery_threshold := nullif(v_state->'delivery'->>'inside48FreeDeliveryThreshold','')::numeric;
  end if;
  if v_delivery_threshold is not null and v_delivery_threshold > 0 and v_subtotal >= v_delivery_threshold then v_delivery := 0; end if;

  if v_user_id is not null then
    select points, coalesce(discount_percent, 0), coalesce(blocked, false)
      into v_points_balance, v_customer_discount, v_customer_blocked
      from public.blitz_customer_profiles where user_id = v_user_id for update;
    v_points_balance := coalesce(v_points_balance, 0);
    v_customer_discount := coalesce(v_customer_discount, 0);
    if v_customer_blocked then raise exception 'This customer account is blocked.'; end if;
  else
    v_points_balance := 0;
    v_customer_discount := 0;
    v_customer_blocked := false;
  end if;

  v_code := upper(trim(coalesce(p_order->>'couponCode','')));
  if v_code <> '' then
    select value into v_coupon from jsonb_array_elements(v_coupons) where upper(value->>'code') = v_code;
    if v_coupon is null or coalesce((v_coupon->>'active')::boolean,false) is not true then raise exception 'This promo code is not active.'; end if;
    if v_now < coalesce((v_coupon->>'startsAt')::date, v_now) or v_now > coalesce((v_coupon->>'expiresAt')::date, v_now) then raise exception 'This promo code is not valid today.'; end if;
    v_limit := nullif(v_coupon->>'usageLimit','')::integer;
    v_used := coalesce((v_coupon->>'usedCount')::integer,0);
    if v_limit is not null and v_used >= v_limit then raise exception 'This promo code has reached its use limit.'; end if;
    v_min := coalesce((v_coupon->>'minSubtotal')::numeric,0);
    if v_subtotal < v_min then raise exception 'The order does not meet this promo code minimum.'; end if;
    v_coupon_id := v_coupon->>'id';
    if coalesce(v_coupon->>'category','standard') = 'loyalty' then
      if p_points_to_spend > 0 then raise exception 'Use either a loyalty code or a point redemption, not both.'; end if;
      if v_user_id is null then raise exception 'Sign in to use loyalty promo codes.'; end if;
      v_points_cost := greatest(0, coalesce((v_coupon->>'pointsCost')::integer,0));
      select points into v_points_balance from public.blitz_customer_profiles where user_id = v_user_id for update;
      v_points_balance := coalesce(v_points_balance,0);
      if v_points_balance < v_points_cost then raise exception 'Not enough loyalty points for this code.'; end if;
    end if;
    if v_coupon->>'target' = 'delivery' then
      v_delivery_discount := case when v_coupon->>'type' = 'percent' then least(v_delivery, round(v_delivery * (v_coupon->>'value')::numeric / 100, 2)) else least(v_delivery, case when coalesce((v_coupon->>'value')::numeric,0) = 0 then v_delivery else (v_coupon->>'value')::numeric end) end;
    else
      v_targets_all := jsonb_array_length(coalesce(v_coupon->'productIds','[]'::jsonb)) = 0 and jsonb_array_length(coalesce(v_coupon->'categoryIds','[]'::jsonb)) = 0;
      for v_line in select value from jsonb_array_elements(p_order->'items') loop
        -- Resolve category membership from the server catalog, never from customer-submitted category IDs.
        select value into v_product from jsonb_array_elements(v_products) where value->>'id' = v_line->>'productId' limit 1;
        v_item_eligible := v_targets_all or (coalesce(v_coupon->'productIds','[]'::jsonb) @> jsonb_build_array(v_line->>'productId'));
        if not v_item_eligible then
          with recursive assigned(id) as (
            select nullif(v_product->>'categoryId','')
            union
            select value from jsonb_array_elements_text(coalesce(v_product->'categoryIds','[]'::jsonb)) value
          ), ancestry(id, parent_id) as (
            select c->>'id', nullif(c->>'parentId','')
            from jsonb_array_elements(coalesce(v_state->'categories','[]'::jsonb)) c
            join assigned a on a.id = c->>'id'
            union
            select c->>'id', nullif(c->>'parentId','')
            from ancestry a
            join jsonb_array_elements(coalesce(v_state->'categories','[]'::jsonb)) c on c->>'id' = a.parent_id
          )
          select exists (
            select 1
            from jsonb_array_elements_text(coalesce(v_coupon->'categoryIds','[]'::jsonb)) allowed(id)
            join ancestry a on a.id = allowed.id
          ) into v_item_eligible;
        end if;
        if v_item_eligible then v_eligible := v_eligible + coalesce((v_line->>'unitPrice')::numeric,0) * coalesce((v_line->>'qty')::integer,0); end if;
      end loop;
      if v_eligible <= 0 then raise exception 'No items in the cart qualify for this code.'; end if;
      v_discount := case when v_coupon->>'type' = 'percent' then least(v_eligible, round(v_eligible * (v_coupon->>'value')::numeric / 100, 2)) else least(v_eligible, coalesce((v_coupon->>'value')::numeric,0)) end;
    end if;
    if coalesce((v_coupon->>'perCustomerLimit')::integer,0) > 0 then
      if (select count(*) from public.blitz_coupon_redemptions r where r.coupon_id = v_coupon_id and ((v_user_id is not null and r.user_id = v_user_id) or (v_user_id is null and r.phone = v_phone))) >= (v_coupon->>'perCustomerLimit')::integer then raise exception 'You have reached the per-customer limit for this code.'; end if;
    end if;
    update public.blitz_store_state set data = jsonb_set(data, '{coupons}', (
      select coalesce(jsonb_agg(case when c->>'id' = v_coupon_id then jsonb_set(c, '{usedCount}', to_jsonb(coalesce((c->>'usedCount')::integer,0)+1), true) else c end), '[]'::jsonb) from jsonb_array_elements(v_coupons) c
    )) where id='main';
    insert into public.blitz_coupon_redemptions(coupon_id, code, user_id, phone, order_number) values(v_coupon_id, v_code, v_user_id, v_phone, 'pending') returning id into v_redemption_id;
    select data->'coupons' into v_coupons from public.blitz_store_state where id='main';
  end if;

  -- Validate and price an optional configured loyalty reward from server-owned settings.
  if p_points_to_spend > 0 then
    if v_user_id is null then raise exception 'Sign in to redeem loyalty points.'; end if;
    if v_points_cost > 0 then raise exception 'Use either a loyalty code or a point redemption, not both.'; end if;
    v_reward_id := nullif(p_order->>'loyaltyRewardId','');
    select value into v_reward_rule from jsonb_array_elements(coalesce(v_state->'store'->'loyaltyRewardRules','[]'::jsonb)) value where value->>'id' = v_reward_id and coalesce((value->>'active')::boolean,false) = true;
    if v_reward_rule is null then raise exception 'This loyalty reward is no longer available.'; end if;
    v_points_cost := greatest(1, coalesce((v_reward_rule->>'pointsRequired')::integer,0));
    if p_points_to_spend <> v_points_cost or coalesce((v_reward_rule->>'pointsRequired')::integer,0) <> coalesce((p_order->>'loyaltyPointsRedeemed')::integer,0) then raise exception 'The loyalty reward points requirement changed. Refresh checkout.'; end if;
    if v_points_balance < v_points_cost then raise exception 'Not enough loyalty points for this reward.'; end if;
    if v_reward_rule->>'kind' = 'discount' then
      v_offer_reward_discount := least(v_subtotal, greatest(0, coalesce((v_reward_rule->>'discountAmount')::numeric,0)));
    elsif v_reward_rule->>'kind' = 'free-delivery' then
      v_delivery_discount := v_delivery;
    else raise exception 'Invalid loyalty reward type.'; end if;
  end if;

  -- Recheck active grouped bundle deals from the authoritative store catalog.
  for v_offer in select value from jsonb_array_elements(coalesce(v_state->'store'->'offerCollections','[]'::jsonb)) value loop
    if coalesce(v_offer->>'type','single') = 'group' and coalesce((v_offer->>'active')::boolean,false) = true
      and (nullif(v_offer->>'startsAt','') is null or (v_offer->>'startsAt')::timestamptz <= now())
      and (nullif(v_offer->>'endsAt','') is null or (v_offer->>'endsAt')::timestamptz >= now()) then
      select count(*) into v_offer_required from jsonb_object_keys(coalesce(v_offer->'productPrices','{}'::jsonb));
      select count(distinct item->>'productId') into v_offer_present
        from jsonb_array_elements(p_order->'items') item
        join jsonb_object_keys(coalesce(v_offer->'productPrices','{}'::jsonb)) required(product_id) on required.product_id = item->>'productId';
      if v_offer_required >= 2 and v_offer_present = v_offer_required then
        select coalesce(sum(x.unit_price),0) into v_offer_original from (
          select distinct on (item->>'productId') (item->>'unitPrice')::numeric as unit_price
          from jsonb_array_elements(p_order->'items') with ordinality as rows(item, ord)
          join jsonb_object_keys(coalesce(v_offer->'productPrices','{}'::jsonb)) required(product_id) on required.product_id = item->>'productId'
          order by item->>'productId', ord
        ) x;
        v_offer_price := greatest(0, coalesce((v_offer->>'bundlePrice')::numeric,0));
        v_offer_discount := v_offer_discount + greatest(0, v_offer_original - v_offer_price);
      end if;
    end if;
  end loop;

  -- Apply bundle and loyalty discounts before any per-customer percentage discount.
  v_discount := least(v_subtotal, v_discount + v_offer_discount + v_offer_reward_discount);
  v_personal_discount := least(greatest(0, v_subtotal - v_discount), round(greatest(0, v_subtotal - v_discount) * least(100, greatest(0, v_customer_discount)) / 100, 2));
  v_discount := least(v_subtotal, v_discount + v_personal_discount);
  v_total := greatest(0, v_subtotal - v_discount) + greatest(0, v_delivery - v_delivery_discount);
  if abs(v_total - coalesce((p_order->>'total')::numeric, -999)) > 0.02 then raise exception 'The final total changed. Refresh your cart and try again.'; end if;
  if v_user_id is not null then
    v_points_earned := 0;
    for v_line in select value from jsonb_array_elements(p_order->'items') loop
      select value into v_product from jsonb_array_elements(v_state->'products') where value->>'id' = v_line->>'productId' limit 1;
      v_qty := greatest(0, coalesce((v_line->>'qty')::integer, 0));
      if v_product is not null and nullif(v_product->>'loyaltyPoints','') is not null then
        v_points_earned := v_points_earned + greatest(0, coalesce((v_product->>'loyaltyPoints')::integer,0)) * v_qty;
      elsif coalesce((v_state->'store'->>'loyaltyPointsPer10IlsEnabled')::boolean, false) then
        v_points_earned := v_points_earned + greatest(0, floor(coalesce((v_line->>'unitPrice')::numeric,0) * v_qty / 10)::integer * greatest(0, coalesce((v_state->'store'->>'loyaltyPointsPer10Ils')::integer,1)));
      end if;
    end loop;
  else v_points_earned := 0; end if;

  -- Keep cost/brand/category snapshots on the order, but obtain cost from the private admin-only table,
  -- never from customer-submitted JSON. Historical analytics remain accurate after catalog edits.
  select coalesce(jsonb_agg(
    (item - 'unitCost') || jsonb_build_object(
      'brandId', coalesce(prod.value->>'brandId', item->>'brandId'),
      'categoryId', coalesce(prod.value->>'categoryId', item->>'categoryId')
    )
  ), '[]'::jsonb) into v_order_items
  from jsonb_array_elements(p_order->'items') as x(item)
  left join lateral (
    select value from jsonb_array_elements(v_state->'products') as y(value)
    where value->>'id' = item->>'productId' limit 1
  ) prod on true
  left join public.blitz_product_costs pc on pc.product_id = item->>'productId';

  v_order_number := 'BG#' || nextval('public.blitz_order_number_seq')::text;
  v_order := jsonb_set(p_order, '{items}', v_order_items, true) || jsonb_build_object(
    'id', v_order_id::text,
    'number', v_order_number,
    'createdAt', now(),
    'status','new',
    'statusUpdatedAt', now(),
    'statusHistory', jsonb_build_array(jsonb_build_object('status','new','at',now())),
    'payment', v_payment_method,
    'paymentStatus', v_payment_status,
    'paymentReference', null,
    'loyaltyPointsEarned', case when v_payment_method = 'cod' then v_points_earned else 0 end,
    'loyaltyPointsPending', case when v_payment_method = 'cod' then 0 else v_points_earned end,
    'loyaltyPointsRedeemed', case when v_payment_method = 'cod' then v_points_cost else 0 end,
    'loyaltyRewardId', v_reward_id,
    'loyaltyPointsSpent', case when v_payment_method = 'cod' then v_points_cost else 0 end,
    'loyaltyPointsSpentPending', case when v_payment_method = 'cod' then 0 else v_points_cost end,
    'total',v_total,
    'productSubtotal',v_subtotal,
    'discount',v_discount,
    'personalDiscount',v_personal_discount,
    'deliveryFee',greatest(0,v_delivery-v_delivery_discount)
  );
  insert into public.blitz_orders(id, number, user_id, payload, points_earned, points_spent, created_at)
  values(v_order_id, v_order_number, v_user_id, v_order,
    case when v_payment_method = 'cod' then v_points_earned else 0 end,
    case when v_payment_method = 'cod' then v_points_cost else 0 end, now());
  insert into public.blitz_order_item_costs(order_number, product_id, variant_id, quantity, unit_cost)
  select v_order_number, item->>'productId', coalesce(nullif(item->>'variantId',''), ''),
         greatest(1, coalesce((item->>'qty')::integer, 1)), pc.cost_price
  from jsonb_array_elements(p_order->'items') as x(item)
  join public.blitz_product_costs pc on pc.product_id = item->>'productId'
  where pc.cost_price is not null
  on conflict (order_number, product_id, variant_id) do update
  set quantity = excluded.quantity, unit_cost = excluded.unit_cost;
  if v_redemption_id is not null then
    update public.blitz_coupon_redemptions set order_number = v_order_number where id = v_redemption_id;
  end if;

  -- Store stock/coupon changes atomically in the shared catalog document.
  update public.blitz_store_state set data = jsonb_set(jsonb_set(data, '{products}', v_products, true), '{coupons}', v_coupons, true), updated_at=now() where id='main';
  if v_user_id is not null then
    if v_payment_method = 'cod' then
      insert into public.blitz_customer_profiles(user_id, points, wishlist, updated_at)
      values(v_user_id, greatest(0,v_points_balance-v_points_cost)+v_points_earned, '[]'::jsonb, now())
      on conflict(user_id) do update set points = greatest(0, public.blitz_customer_profiles.points - v_points_cost) + v_points_earned, updated_at=now();
    elsif v_points_cost > 0 then
      -- Reserve loyalty points for an unpaid card/bank order; a failed/cancelled order returns them.
      update public.blitz_customer_profiles set points = greatest(0, points-v_points_cost), updated_at=now() where user_id=v_user_id;
    end if;
    select points into v_points_balance from public.blitz_customer_profiles where user_id=v_user_id;
  else v_points_balance := 0; end if;
  return jsonb_build_object('order',v_order,'pointsEarned',case when v_payment_method='cod' then v_points_earned else 0 end,'pointsBalance',v_points_balance);
end;
$$;


grant execute on function public.blitz_create_order(jsonb, integer) to anon, authenticated;
