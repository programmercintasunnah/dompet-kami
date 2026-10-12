-- 0004_seed_categories.sql
-- Kategori default. Aman dijalankan ulang berkat unique index parsial.

insert into public.categories (name, type, icon, color, created_by, updated_by)
select x.name, x.type, x.icon, x.color, null, null
from (values
  ('Gaji',            'income',  'wallet',     '#16a34a'),
  ('Bonus',           'income',  'gift',       '#15803d'),
  ('Usaha',           'income',  'store',      '#166534'),
  ('Lainnya',         'income',  'plus',       '#65a30d'),
  ('Makan & Minum',   'expense', 'utensils',   '#dc2626'),
  ('Belanja Dapur',   'expense', 'shopping-basket', '#ef4444'),
  ('Transportasi',    'expense', 'car',        '#f97316'),
  ('Listrik & Air',   'expense', 'zap',        '#eab308'),
  ('Internet & Pulsa','expense', 'wifi',       '#0ea5e9'),
  ('Pendidikan',      'expense', 'graduation-cap', '#6366f1'),
  ('Kesehatan',       'expense', 'heart-pulse','#ec4899'),
  ('Hiburan',         'expense', 'clapperboard', '#a855f7'),
  ('Cicilan',         'expense', 'landmark',   '#f59e0b'),
  ('Sedekah',         'expense', 'hand-heart', '#14b8a6'),
  ('Lainnya',         'expense', 'ellipsis',   '#64748b')
) as x(name, type, icon, color)
where not exists (
  select 1 from public.categories c
  where lower(c.name) = lower(x.name)
    and c.type = x.type
    and c.deleted_at is null
);
