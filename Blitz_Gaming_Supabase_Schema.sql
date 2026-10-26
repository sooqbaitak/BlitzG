-- BLITZ GAMING cloud schema for Supabase (run in Supabase SQL Editor before deployment).
-- Never put a Supabase secret/service_role key into a VITE_* environment variable.

create table if not exists public.blitz_store_state (
  id text primary key check (id = 'main'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.blitz_store_state (id, data) values ('main', '{}'::jsonb) on conflict (id) do nothing;

create table if not exists public.blitz_customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  wishlist jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
-- Customer-management fields; safe to apply to an existing deployment.
alter table public.blitz_customer_profiles add column if not exists display_name text not null default '';
alter table public.blitz_customer_profiles add column if not exists email text not null default '';
alter table public.blitz_customer_profiles add column if not exists phone text not null default '';
alter table public.blitz_customer_profiles add column if not exists highlighted boolean not null default false;
alter table public.blitz_customer_profiles add column if not exists blocked boolean not null default false;
alter table public.blitz_customer_profiles add column if not exists admin_note text not null default '';
alter table public.blitz_customer_profiles add column if not exists discount_percent numeric not null default 0;
alter table public.blitz_customer_profiles add column if not exists account_message text not null default '';
alter table public.blitz_customer_profiles drop constraint if exists blitz_customer_profiles_discount_percent_check;
alter table public.blitz_customer_profiles add constraint blitz_customer_profiles_discount_percent_check check (discount_percent >= 0 and discount_percent <= 100);

-- Private per-product acquisition costs: never stored in the publicly readable store JSON.
create table if not exists public.blitz_product_costs (
  product_id text primary key,
  cost_price numeric check (cost_price is null or cost_price >= 0),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.blitz_order_number_seq start with 1001 increment by 1;
create table if not exists public.blitz_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null,
  points_earned integer not null default 0,
  points_spent integer not null default 0,
  created_at timestamptz not null default now()
);
-- Keep this schema safe to re-run on a project that already has earlier versions.
alter table public.blitz_orders add column if not exists points_earned integer not null default 0;
alter table public.blitz_orders add column if not exists points_spent integer not null default 0;
create index if not exists blitz_orders_user_created_idx on public.blitz_orders(user_id, created_at desc);

create table if not exists public.blitz_payment_attempts (
  reference text primary key,
  order_number text not null references public.blitz_orders(number) on delete cascade,
  amount_agora bigint not null check (amount_agora > 0),
  currency text not null default 'ILS' check (currency = 'ILS'),
  status text not null default 'pending' check (status in ('pending','success','failed')),
  gateway_status text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists blitz_payment_attempts_order_idx on public.blitz_payment_attempts(order_number, created_at desc);

-- Acquisition-cost snapshots are private and never stored in customer-readable order payloads.
create table if not exists public.blitz_order_item_costs (
  order_number text not null references public.blitz_orders(number) on delete cascade,
  product_id text not null,
  variant_id text not null default '',
  quantity integer not null check (quantity > 0),
  unit_cost numeric not null check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  primary key (order_number, product_id, variant_id)
);

create table if not exists public.blitz_coupon_redemptions (
  id bigint generated always as identity primary key,
  coupon_id text not null,
  code text not null,
  user_id uuid references auth.users(id) on delete set null,
  phone text,
  order_number text not null,
  created_at timestamptz not null default now()
);
create index if not exists blitz_coupon_redemptions_coupon_idx on public.blitz_coupon_redemptions(coupon_id, user_id, phone);

alter table public.blitz_store_state enable row level security;
alter table public.blitz_customer_profiles enable row level security;
alter table public.blitz_product_costs enable row level security;
alter table public.blitz_orders enable row level security;
alter table public.blitz_order_item_costs enable row level security;
alter table public.blitz_coupon_redemptions enable row level security;
alter table public.blitz_payment_attempts enable row level security;

drop policy if exists "Public reads storefront data" on public.blitz_store_state;
create policy "Public reads storefront data" on public.blitz_store_state for select to anon, authenticated using (true);
drop policy if exists "Admins insert storefront data" on public.blitz_store_state;
create policy "Admins insert storefront data" on public.blitz_store_state for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');
drop policy if exists "Admins update storefront data" on public.blitz_store_state;
create policy "Admins update storefront data" on public.blitz_store_state for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');

drop policy if exists "Admins read product acquisition costs" on public.blitz_product_costs;
create policy "Admins read product acquisition costs" on public.blitz_product_costs for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');
drop policy if exists "Admins insert product acquisition costs" on public.blitz_product_costs;
create policy "Admins insert product acquisition costs" on public.blitz_product_costs for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');
drop policy if exists "Admins update product acquisition costs" on public.blitz_product_costs;
create policy "Admins update product acquisition costs" on public.blitz_product_costs for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');

drop policy if exists "Customers read own profile" on public.blitz_customer_profiles;
create policy "Customers read own profile" on public.blitz_customer_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Customers create own profile" on public.blitz_customer_profiles;
create policy "Customers create own profile" on public.blitz_customer_profiles for insert to authenticated with check (auth.uid() = user_id and points = 0);
drop policy if exists "Customers update own profile" on public.blitz_customer_profiles;
create policy "Customers update own profile" on public.blitz_customer_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Customers and admins read allowed orders" on public.blitz_orders;
create policy "Customers and admins read allowed orders" on public.blitz_orders for select to authenticated using (auth.uid() = user_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');
-- Private cost snapshots are visible only to admins; customers can read their own order payload without cost data.
drop policy if exists "Admins read private order item costs" on public.blitz_order_item_costs;
create policy "Admins read private order item costs" on public.blitz_order_item_costs for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');
-- Order creation/updates are only allowed through the SECURITY DEFINER RPC below.

drop policy if exists "Admins view coupon redemptions" on public.blitz_coupon_redemptions;
create policy "Admins view coupon redemptions" on public.blitz_coupon_redemptions for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin');

-- If this schema is reapplied to a previous deployment, migrate any old unit-cost snapshots
-- out of customer-readable order JSON before continuing. The unique key makes this rerunnable.
insert into public.blitz_order_item_costs(order_number, product_id, variant_id, quantity, unit_cost)
select o.number, item->>'productId', coalesce(nullif(item->>'variantId',''), ''),
       sum(greatest(1, coalesce((item->>'qty')::integer, 1)))::integer, max((item->>'unitCost')::numeric)
from public.blitz_orders o
cross join lateral jsonb_array_elements(coalesce(o.payload->'items','[]'::jsonb)) as lines(item)
where nullif(item->>'unitCost','') is not null and (item->>'unitCost')::numeric >= 0
group by o.number, item->>'productId', coalesce(nullif(item->>'variantId',''), '')
on conflict (order_number, product_id, variant_id) do update
set quantity = excluded.quantity, unit_cost = excluded.unit_cost;
update public.blitz_orders o
set payload = jsonb_set(o.payload, '{items}', coalesce((
  select jsonb_agg(item - 'unitCost') from jsonb_array_elements(coalesce(o.payload->'items','[]'::jsonb)) item
), '[]'::jsonb), true)
where exists (select 1 from jsonb_array_elements(coalesce(o.payload->'items','[]'::jsonb)) item where item ? 'unitCost');

create table if not exists public.blitz_order_email_notifications (
  order_number text primary key,
  status text not null check (status in ('sending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  error text
);
alter table public.blitz_order_email_notifications enable row level security;
-- No anon/authenticated policies: only the Netlify server function may read or update these notification records.
grant select, insert, update on public.blitz_order_email_notifications to service_role;

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
  v_delivery_discount numeric := 0;
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
    select coalesce((a->>'fee')::numeric,0) into v_delivery from jsonb_array_elements(coalesce(v_state->'delivery'->'additionalAreas','[]'::jsonb)) a where a->>'id' = v_area and coalesce((a->>'active')::boolean,true);
    if not found then raise exception 'Please choose a valid delivery area.'; end if;
  end if;

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

  -- Apply any admin-assigned customer discount server-side after the promo code.
  -- v_discount represents only eligible product discounts at this point (delivery coupons are separate).
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
      else
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

create or replace function public.blitz_admin_update_order(p_number text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if not (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or (coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  ) then
    raise exception 'Only store administrators can update order status.';
  end if;
  if p_status is null or p_status not in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Invalid order status.';
  end if;
  update public.blitz_orders
    set payload = jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{status}', to_jsonb(p_status), true),
        '{statusUpdatedAt}', to_jsonb(now()::text), true
      ),
      '{statusHistory}', coalesce(payload->'statusHistory', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status',p_status,'at',now())), true
    )
    where number = p_number
    returning payload into v_payload;
  if v_payload is null then raise exception 'Order not found.'; end if;
  return v_payload;
end;
$$;

revoke all on function public.blitz_admin_update_order(text, text) from public, anon;
grant execute on function public.blitz_admin_update_order(text, text) to authenticated;

-- Admin-only delivery/courier tracking fields are stored in the order payload and exposed only
-- through the tracking Netlify Function after the order number + checkout phone are verified.
create or replace function public.blitz_admin_update_order_delivery(p_number text, p_delivery jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_carrier text;
  v_url text;
  v_person text;
  v_phone text;
  v_message text;
begin
  if not (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or (coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  ) then
    raise exception 'Only store administrators can update delivery tracking.';
  end if;
  v_carrier := left(trim(coalesce(p_delivery->>'carrierName','')), 100);
  v_url := left(trim(coalesce(p_delivery->>'trackingUrl','')), 1000);
  v_person := left(trim(coalesce(p_delivery->>'deliveryPersonName','')), 100);
  v_phone := left(trim(coalesce(p_delivery->>'deliveryPersonPhone','')), 40);
  v_message := left(trim(coalesce(p_delivery->>'trackingMessage','')), 600);
  if v_url <> '' and v_url !~* '^https?://' then raise exception 'Tracking URL must start with http:// or https://.'; end if;
  update public.blitz_orders
    set payload = payload || jsonb_build_object(
      'carrierName', v_carrier,
      'trackingUrl', v_url,
      'deliveryPersonName', v_person,
      'deliveryPersonPhone', v_phone,
      'trackingMessage', v_message
    )
    where number = p_number
    returning payload into v_payload;
  if v_payload is null then raise exception 'Order not found.'; end if;
  return v_payload;
end;
$$;
revoke all on function public.blitz_admin_update_order_delivery(text, jsonb) from public, anon;
grant execute on function public.blitz_admin_update_order_delivery(text, jsonb) to authenticated;


-- Prepare and verify hosted card payments. These endpoints are server-to-server only.
create or replace function public.blitz_prepare_card_payment(p_order_number text, p_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_payload jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required.'; end if;
  if p_reference is null or p_reference !~ '^[A-Za-z0-9.=\-]{6,100}$' then raise exception 'Invalid payment reference.'; end if;
  select payload into v_payload from public.blitz_orders where number=p_order_number for update;
  if v_payload is null then raise exception 'Order not found.'; end if;
  if v_payload->>'payment' <> 'card' then raise exception 'Order is not a card-payment order.'; end if;
  if v_payload->>'paymentStatus' not in ('awaiting_payment') then raise exception 'Order is not awaiting card payment.'; end if;
  update public.blitz_orders set payload = payload || jsonb_build_object('paymentReference',p_reference) where number=p_order_number returning payload into v_payload;
  return v_payload;
end; $$;
revoke all on function public.blitz_prepare_card_payment(text,text) from public, anon, authenticated;
grant execute on function public.blitz_prepare_card_payment(text,text) to service_role;

create or replace function public.blitz_release_unpaid_order(p_number text, p_reason text, p_payment_status text default 'cancelled')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_order public.blitz_orders%rowtype;
  v_state jsonb;
  v_products jsonb;
  v_line jsonb;
  v_pid text;
  v_vid text;
  v_qty integer;
  v_coupon_code text;
  v_coupon_id text;
  v_user_id uuid;
  v_points_refund integer;
  v_payload jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not (
    coalesce(auth.jwt()->'app_metadata'->>'role'='admin',false) or coalesce(auth.jwt()->'app_metadata'->'roles','[]'::jsonb) ? 'admin'
  ) then raise exception 'Only backend payment functions or administrators can cancel unpaid orders.'; end if;
  if p_payment_status not in ('failed','cancelled') then raise exception 'Invalid unpaid order state.'; end if;
  select * into v_order from public.blitz_orders where number=p_number for update;
  if not found then raise exception 'Order not found.'; end if;
  v_payload := v_order.payload;
  if v_payload->>'paymentStatus' = 'paid' then raise exception 'A paid order cannot be released as unpaid.'; end if;
  if coalesce(v_payload->>'paymentStatus','') in ('failed','cancelled') and coalesce(v_payload->>'status','')='cancelled' then return v_payload; end if;
  if coalesce(v_payload->>'payment','cod') not in ('card','bank_transfer') then raise exception 'Only unpaid card or bank-transfer orders may be released here.'; end if;

  select data into v_state from public.blitz_store_state where id='main' for update;
  v_products := coalesce(v_state->'products','[]'::jsonb);
  for v_line in select value from jsonb_array_elements(coalesce(v_payload->'items','[]'::jsonb)) loop
    v_pid := v_line->>'productId'; v_vid := nullif(v_line->>'variantId',''); v_qty := greatest(0,coalesce((v_line->>'qty')::integer,0));
    if v_qty > 0 then
      select coalesce(jsonb_agg(case when prod->>'id'=v_pid then
        jsonb_set(jsonb_set(prod,'{stock}',to_jsonb(coalesce((prod->>'stock')::integer,0)+v_qty),true),'{sold}',to_jsonb(greatest(0,coalesce((prod->>'sold')::integer,0)-v_qty)),true)
        || case when v_vid is not null then jsonb_build_object('variants',(
          select coalesce(jsonb_agg(case when vr->>'id'=v_vid then jsonb_set(vr,'{stock}',to_jsonb(coalesce((vr->>'stock')::integer,0)+v_qty),true) else vr end),'[]'::jsonb)
          from jsonb_array_elements(coalesce(prod->'variants','[]'::jsonb)) vr
        )) else '{}'::jsonb end
      else prod end),'[]'::jsonb) into v_products from jsonb_array_elements(v_products) prod;
    end if;
  end loop;
  update public.blitz_store_state set data=jsonb_set(data,'{products}',v_products,true),updated_at=now() where id='main';

  select code,coupon_id into v_coupon_code,v_coupon_id from public.blitz_coupon_redemptions where order_number=p_number limit 1;
  if v_coupon_id is not null then
    update public.blitz_store_state set data=jsonb_set(data,'{coupons}',(
      select coalesce(jsonb_agg(case when c->>'id'=v_coupon_id then jsonb_set(c,'{usedCount}',to_jsonb(greatest(0,coalesce((c->>'usedCount')::integer,0)-1)),true) else c end),'[]'::jsonb)
      from jsonb_array_elements(coalesce(data->'coupons','[]'::jsonb)) c
    ),true),updated_at=now() where id='main';
    delete from public.blitz_coupon_redemptions where order_number=p_number;
  end if;

  v_user_id := v_order.user_id;
  v_points_refund := greatest(0,coalesce((v_payload->>'loyaltyPointsSpentPending')::integer,0));
  if v_user_id is not null and v_points_refund > 0 then
    insert into public.blitz_customer_profiles(user_id,points,wishlist,updated_at) values(v_user_id,v_points_refund,'[]'::jsonb,now())
    on conflict(user_id) do update set points=public.blitz_customer_profiles.points+v_points_refund,updated_at=now();
  end if;
  v_payload := v_payload || jsonb_build_object(
    'paymentStatus',p_payment_status,
    'status','cancelled',
    'statusUpdatedAt',now(),
    'paymentFailureReason',left(coalesce(p_reason,'Payment was not completed.'),180),
    'loyaltyPointsPending',0,
    'loyaltyPointsSpentPending',0,
    'loyaltyPointsSpent',0,
    'loyaltyPointsEarned',0,
    'statusHistory',coalesce(v_payload->'statusHistory','[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','cancelled','at',now(),'message',left(coalesce(p_reason,'Payment was not completed.'),180)))
  );
  update public.blitz_orders set payload=v_payload,points_earned=0,points_spent=0 where number=p_number;
  return v_payload;
end; $$;
revoke all on function public.blitz_release_unpaid_order(text,text,text) from public, anon, authenticated;
grant execute on function public.blitz_release_unpaid_order(text,text,text) to authenticated, service_role;

create or replace function public.blitz_mark_card_payment_paid(p_reference text, p_amount_agora bigint, p_currency text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt public.blitz_payment_attempts%rowtype; v_order public.blitz_orders%rowtype; v_payload jsonb; v_total_agora bigint; v_earned integer; v_user_id uuid; v_points_spent integer; v_balance integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required.'; end if;
  select * into v_attempt from public.blitz_payment_attempts where reference=p_reference for update;
  if not found then raise exception 'Payment attempt not found.'; end if;
  select * into v_order from public.blitz_orders where number=v_attempt.order_number for update;
  if not found then raise exception 'Payment order not found.'; end if;
  if v_attempt.status='success' and v_order.payload->>'paymentStatus'='paid' then return v_order.payload; end if;
  if p_currency <> 'ILS' or v_attempt.currency <> 'ILS' or p_amount_agora <> v_attempt.amount_agora then raise exception 'Payment currency or reference amount does not match.'; end if;
  v_payload := v_order.payload;
  if v_payload->>'payment' <> 'card' or v_payload->>'paymentStatus' <> 'awaiting_payment' or v_payload->>'paymentReference' <> p_reference then raise exception 'This order is not awaiting this card payment.'; end if;
  v_total_agora := round((v_payload->>'total')::numeric*100)::bigint;
  if v_total_agora <> p_amount_agora then raise exception 'Payment amount does not match the order total.'; end if;
  v_earned := greatest(0,coalesce((v_payload->>'loyaltyPointsPending')::integer,0));
  v_points_spent := greatest(0,coalesce((v_payload->>'loyaltyPointsSpentPending')::integer,0));
  v_user_id := v_order.user_id;
  if v_user_id is not null and v_earned > 0 then
    insert into public.blitz_customer_profiles(user_id,points,wishlist,updated_at) values(v_user_id,v_earned,'[]'::jsonb,now())
    on conflict(user_id) do update set points=public.blitz_customer_profiles.points+v_earned,updated_at=now();
    select points into v_balance from public.blitz_customer_profiles where user_id=v_user_id;
  end if;
  v_payload := v_payload || jsonb_build_object('paymentStatus','paid','paymentReference',p_reference,'paymentPaidAt',now(),'loyaltyPointsEarned',case when v_user_id is null then 0 else v_earned end,'loyaltyPointsPending',0,'loyaltyPointsSpent',case when v_user_id is null then 0 else v_points_spent end,'loyaltyPointsSpentPending',0);
  update public.blitz_orders set payload=v_payload,points_earned=case when v_user_id is null then 0 else v_earned end,points_spent=case when v_user_id is null then 0 else v_points_spent end where number=v_order.number;
  update public.blitz_payment_attempts set status='success',gateway_status='success',verified_at=now() where reference=p_reference;
  return v_payload;
end; $$;
revoke all on function public.blitz_mark_card_payment_paid(text,bigint,text) from public, anon, authenticated;
grant execute on function public.blitz_mark_card_payment_paid(text,bigint,text) to service_role;

create or replace function public.blitz_mark_card_payment_failed(p_reference text, p_gateway_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt public.blitz_payment_attempts%rowtype; v_payload jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required.'; end if;
  select * into v_attempt from public.blitz_payment_attempts where reference=p_reference for update;
  if not found then raise exception 'Payment attempt not found.'; end if;
  select payload into v_payload from public.blitz_orders where number=v_attempt.order_number for update;
  if v_attempt.status='success' or v_payload->>'paymentStatus'='paid' then return v_payload; end if;
  update public.blitz_payment_attempts set status='failed',gateway_status=left(coalesce(p_gateway_status,'failed'),80),verified_at=now() where reference=p_reference;
  if v_payload->>'paymentReference'=p_reference and v_payload->>'paymentStatus'='awaiting_payment' then
    v_payload := public.blitz_release_unpaid_order(v_attempt.order_number,'Card payment was not completed.','failed');
  end if;
  return v_payload;
end; $$;
revoke all on function public.blitz_mark_card_payment_failed(text,text) from public, anon, authenticated;
grant execute on function public.blitz_mark_card_payment_failed(text,text) to service_role;

create or replace function public.blitz_admin_mark_order_paid(p_number text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.blitz_orders%rowtype; v_payload jsonb; v_earned integer; v_spent integer; v_balance integer;
begin
  if not (coalesce(auth.jwt()->'app_metadata'->>'role'='admin',false) or coalesce(auth.jwt()->'app_metadata'->'roles','[]'::jsonb) ? 'admin') then raise exception 'Only store administrators may confirm bank transfers.'; end if;
  select * into v_order from public.blitz_orders where number=p_number for update;
  if not found then raise exception 'Order not found.'; end if;
  v_payload := v_order.payload;
  if v_payload->>'paymentStatus'='paid' then return v_payload; end if;
  if v_payload->>'payment' <> 'bank_transfer' or v_payload->>'paymentStatus' <> 'awaiting_transfer' then raise exception 'This order is not awaiting a bank transfer.'; end if;
  v_earned := greatest(0,coalesce((v_payload->>'loyaltyPointsPending')::integer,0));
  v_spent := greatest(0,coalesce((v_payload->>'loyaltyPointsSpentPending')::integer,0));
  if v_order.user_id is not null and v_earned > 0 then
    insert into public.blitz_customer_profiles(user_id,points,wishlist,updated_at) values(v_order.user_id,v_earned,'[]'::jsonb,now())
    on conflict(user_id) do update set points=public.blitz_customer_profiles.points+v_earned,updated_at=now();
  end if;
  v_payload := v_payload || jsonb_build_object('paymentStatus','paid','paymentPaidAt',now(),'loyaltyPointsEarned',case when v_order.user_id is null then 0 else v_earned end,'loyaltyPointsPending',0,'loyaltyPointsSpent',case when v_order.user_id is null then 0 else v_spent end,'loyaltyPointsSpentPending',0);
  update public.blitz_orders set payload=v_payload,points_earned=case when v_order.user_id is null then 0 else v_earned end,points_spent=case when v_order.user_id is null then 0 else v_spent end where number=p_number;
  return v_payload;
end; $$;
revoke all on function public.blitz_admin_mark_order_paid(text) from public, anon;
grant execute on function public.blitz_admin_mark_order_paid(text) to authenticated;

create or replace function public.blitz_cancel_unpaid_order(p_number text, p_reason text default 'Cancelled by administrator')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_payload jsonb;
begin
  if not (coalesce(auth.jwt()->'app_metadata'->>'role'='admin',false) or coalesce(auth.jwt()->'app_metadata'->'roles','[]'::jsonb) ? 'admin') then raise exception 'Only store administrators may cancel an unpaid order.'; end if;
  select payload into v_payload from public.blitz_orders where number=p_number;
  if not found then raise exception 'Order not found.'; end if;
  if v_payload->>'paymentStatus'='paid' then raise exception 'A paid order cannot be cancelled through this unpaid-order action.'; end if;
  return public.blitz_release_unpaid_order(p_number, coalesce(p_reason,'Cancelled by administrator'),'cancelled');
end; $$;
revoke all on function public.blitz_cancel_unpaid_order(text,text) from public, anon;
grant execute on function public.blitz_cancel_unpaid_order(text,text) to authenticated;

grant select on public.blitz_store_state to anon, authenticated;
grant insert, update on public.blitz_store_state to authenticated;
revoke all on public.blitz_order_item_costs from anon, authenticated;
grant select on public.blitz_order_item_costs to authenticated;
grant select, insert, update on public.blitz_product_costs to authenticated;
revoke insert, update on public.blitz_customer_profiles from authenticated;
grant select on public.blitz_customer_profiles to authenticated;
grant insert (user_id, wishlist, updated_at) on public.blitz_customer_profiles to authenticated;
grant update (wishlist, updated_at) on public.blitz_customer_profiles to authenticated;
grant select on public.blitz_orders to authenticated;
grant select on public.blitz_coupon_redemptions to authenticated;
revoke all on public.blitz_payment_attempts from public, anon, authenticated;
grant select, insert, update on public.blitz_payment_attempts to service_role;
revoke all on sequence public.blitz_order_number_seq from anon, authenticated;
grant execute on function public.blitz_create_order(jsonb, integer) to anon, authenticated;

-- Public delivery of product images, while only authenticated store admins may upload/change them.
-- This is idempotent, so it can be run again when applying updates.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[])
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[];

drop policy if exists "Public reads Blitz product images" on storage.objects;
create policy "Public reads Blitz product images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "Admins upload Blitz product images" on storage.objects;
create policy "Admins upload Blitz product images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  );

drop policy if exists "Admins update Blitz product images" on storage.objects;
create policy "Admins update Blitz product images" on storage.objects
  for update to authenticated using (
    bucket_id = 'product-images' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  ) with check (
    bucket_id = 'product-images' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  );

drop policy if exists "Admins delete Blitz product images" on storage.objects;
create policy "Admins delete Blitz product images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'product-images' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  );
