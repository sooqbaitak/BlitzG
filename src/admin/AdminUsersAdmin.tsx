// BLITZ GAMING — admin user management and current administrator credentials
import { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Power, UserRoundCog, KeyRound, Save } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { SectionTitle, Button, Input, Select, Modal } from '../components/ui';
import { roleLabel } from './AdminLayout';
import { sha256, getAdminSession, saveAdminSession } from '../lib/db';
import { cloudConfigured, updateCloudAdminAccount } from '../lib/cloud';
import type { AdminRole, AdminUser } from '../lib/types';

export function AdminUsersAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const he = lang === 'he';
  const session = getAdminSession();
  const currentUser = session ? db.admins.find((a) => a.id === session.adminId) : undefined;
  const [profileName, setProfileName] = useState(session?.name ?? currentUser?.name ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('staff');
  const [busy, setBusy] = useState(false);
  const owners = db.admins.filter((a) => a.role === 'owner' && a.active).length;

  const saveProfile = async () => {
    if (!session) { toast('error', 'No active administrator session.'); return; }
    if (profileName.trim().length < 2) { toast('error', ar ? 'الاسم مطلوب' : 'Enter a valid admin name'); return; }
    if (newPassword && newPassword.length < 10) { toast('error', ar ? 'كلمة المرور يجب أن تتكون من 10 أحرف على الأقل' : 'Password must be at least 10 characters'); return; }
    if (newPassword !== confirmPassword) { toast('error', ar ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'); return; }
    setSavingProfile(true);
    try {
      if (cloudConfigured) {
        await updateCloudAdminAccount(profileName.trim(), newPassword || undefined);
        const latest = getAdminSession();
        if (latest) saveAdminSession({ ...latest, name: profileName.trim() });
      } else {
        if (!currentUser) throw new Error('This demo account was not found in the local admin list.');
        const passwordHash = newPassword ? await sha256(newPassword) : currentUser.passwordHash;
        setDb((d) => ({ ...d, admins: d.admins.map((a) => a.id === currentUser.id ? { ...a, name: profileName.trim(), passwordHash } : a) }));
        saveAdminSession({ ...session, name: profileName.trim() });
      }
      setNewPassword(''); setConfirmPassword('');
      toast('success', ar ? 'تم تحديث بيانات المدير' : 'Admin account updated');
    } catch (error) { toast('error', error instanceof Error ? error.message : 'Could not update admin account'); }
    finally { setSavingProfile(false); }
  };

  const add = async () => {
    if (!username.trim() || !name.trim() || password.length < 6) { toast('error', ar ? 'الاسم واسم المستخدم وكلمة مرور 6+ أحرف مطلوبة' : 'Username, name and a 6+ char password are required'); return; }
    if (db.admins.some((a) => a.username.toLowerCase() === username.trim().toLowerCase())) { toast('error', ar ? 'اسم المستخدم محجوز' : 'Username is taken'); return; }
    setBusy(true);
    const passwordHash = await sha256(password);
    const user: AdminUser = { id: `a-${Date.now()}`, username: username.trim().toLowerCase(), passwordHash, name: name.trim(), role, active: true, createdAt: new Date().toISOString() };
    setDb((d) => ({ ...d, admins: [...d.admins, user] }));
    toast('success', ar ? 'أُضيف المستخدم' : 'Admin user added');
    setBusy(false); setAdding(false); setUsername(''); setName(''); setPassword(''); setRole('staff');
  };

  const toggleActive = (id: string) => {
    const target = db.admins.find((a) => a.id === id);
    if (target?.role === 'owner' && owners <= 1 && target.active) { toast('error', ar ? 'يجب إبقاء مالك واحد على الأقل' : 'At least one active owner is required'); return; }
    setDb((d) => ({ ...d, admins: d.admins.map((a) => (a.id === id ? { ...a, active: !a.active } : a)) }));
  };
  const remove = (id: string) => {
    const target = db.admins.find((a) => a.id === id);
    if (target?.role === 'owner' && owners <= 1) { toast('error', ar ? 'لا يمكن حذف المالك الوحيد' : 'Cannot remove the only owner'); return; }
    if (target?.id === session?.adminId) { toast('error', ar ? 'لا تحذف الحساب الذي تستخدمه الآن' : 'You cannot delete the account you are currently using'); return; }
    setDb((d) => ({ ...d, admins: d.admins.filter((a) => a.id !== id) }));
    toast('success', ar ? 'حُذف المستخدم' : 'User removed');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle sub={ar ? 'إدارة بيانات الدخول والحسابات الإدارية' : he ? 'ניהול חשבון המנהל והרשאות' : 'Manage your login details and administrator accounts'}>{ar ? 'مستخدمو الإدارة' : he ? 'משתמשי מנהל' : 'Admin Users'}</SectionTitle>
        {!cloudConfigured && <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[9px] font-bold text-amber-200">LOCAL DEMO</span>}
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-white"><UserRoundCog size={18} className="text-electric"/>{ar ? 'حساب المدير الحالي' : he ? 'החשבון שלי' : 'My Administrator Account'}</h2>
        <p className="mb-4 text-[10px] leading-relaxed text-mute">{cloudConfigured ? (ar ? 'سيتم تحديث اسم العرض وكلمة مرور حساب Supabase الذي سجلت الدخول به.' : 'Updates the display name and password on the authenticated Supabase admin account.') : (ar ? 'يُحدّث هذا بيانات الحساب التجريبي في هذا المتصفح فقط. استخدم Supabase للحماية والمزامنة في الموقع العام.' : 'Updates the demo login stored in this browser only. Configure Supabase for secure production authentication and shared access.')}</p>
        <div className="space-y-3">
          <Input label={ar ? 'اسم المدير الظاهر' : 'Admin display name'} value={profileName} onChange={(e) => setProfileName(e.target.value)} autoComplete="name"/>
          <Input label={ar ? 'كلمة مرور جديدة (اتركها فارغة دون تغيير)' : 'New password (leave blank to keep current)'} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password"/>
          <Input label={ar ? 'تأكيد كلمة المرور' : 'Confirm new password'} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password"/>
          <div className="flex justify-end"><Button onClick={() => void saveProfile()} loading={savingProfile}><Save size={16}/>{ar ? 'حفظ بيانات المدير' : 'Save Admin Account'}</Button></div>
        </div>
      </section>

      {!cloudConfigured && <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-white"><ShieldCheck size={17} className="text-electric"/>{ar ? 'الحسابات المحلية الإضافية' : 'Local Admin Accounts'}</h2>
          <Button onClick={() => setAdding(true)}><Plus size={17} strokeWidth={2.6}/>{ar ? 'مستخدم جديد' : 'Add User'}</Button>
        </div>
        <div className="space-y-2">
          {db.admins.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-violet-accent font-display text-base font-bold text-white">{a.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-white/90">{a.name}<span className="flex items-center gap-1 rounded-full border border-electric/40 bg-electric/10 px-2 py-0.5 text-[9px] font-bold uppercase text-electric"><ShieldCheck size={11}/>{roleLabel(a.role, ar, he)}</span>{!a.active && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-red-400">{ar ? 'موقوف' : 'disabled'}</span>}</p>
                <p className="text-[10px] font-semibold text-mute">@{a.username} · {ar ? 'أُضيف' : 'added'} {new Date(a.createdAt).toLocaleDateString(ar ? 'ar-PS' : 'en-GB')}</p>
              </div>
              <button onClick={() => toggleActive(a.id)} className={`rounded-lg p-2 ${a.active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-mute hover:bg-panel2'}`} aria-label="Toggle active"><Power size={17}/></button>
              <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-mute hover:bg-red-500/10 hover:text-red-400" aria-label="Delete"><Trash2 size={17}/></button>
            </div>
          ))}
        </div>
      </section>}

      <Modal open={adding} onClose={() => setAdding(false)} title={ar ? 'مستخدم إدارة جديد' : 'New Admin User'}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><Input label={ar ? 'الاسم الكامل' : 'Full name'} value={name} onChange={(e) => setName(e.target.value)}/><Input label={ar ? 'اسم المستخدم' : 'Username'} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="manager1" autoComplete="off"/></div>
          <Input label={ar ? 'كلمة المرور (6+ أحرف)' : 'Password (6+ chars)'} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"/>
          <Select label={ar ? 'الدور' : 'Role'} value={role} onChange={(e) => setRole(e.target.value as AdminRole)}><option value="staff">{ar ? 'موظف — طلبات ومخزون ومنظرة عامة' : 'Staff — orders, inventory, overview'}</option><option value="manager">{ar ? 'مدير — كل شيء ما عدا الإعدادات والمستخدمين' : 'Manager — everything except delivery/store/users'}</option><option value="owner">{ar ? 'مالك — صلاحيات كاملة' : 'Owner — full access'}</option></Select>
          <div className="flex justify-end gap-2 border-t border-line pt-4"><Button variant="outline" onClick={() => setAdding(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button><Button onClick={() => void add()} loading={busy}><KeyRound size={15}/>{ar ? 'إنشاء المستخدم' : 'Create User'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
