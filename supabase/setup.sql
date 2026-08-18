-- NOMAD WEAR: Supabase-ийн бодит ажиллагаанд шаардлагатай RLS болон Storage тохиргоо.
-- Энэ файлыг Supabase Dashboard → SQL Editor хэсэгт нэг удаа ажиллуулна.

-- Админ эсэхийг RLS recursion үүсгэхгүй шалгах хамгаалагдсан функц.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Шинээр Auth хэрэглэгч үүсэхэд profiles мөрийг автоматаар үүсгэнэ.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Одоо байгаа Auth хэрэглэгчдэд байхгүй profile мөрийг нөхөж үүсгэнэ.
insert into public.profiles (id, full_name, role)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''), 'customer'
from auth.users
on conflict (id) do nothing;

-- Бүх хүснэгт дээр RLS идэвхжүүлнэ.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

-- Каталогийг хүн бүр уншина; зөвхөн admin өөрчилнө.
drop policy if exists "catalog read categories" on public.categories;
create policy "catalog read categories" on public.categories
for select to anon, authenticated using (true);
drop policy if exists "admin manage categories" on public.categories;
create policy "admin manage categories" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog read products" on public.products;
create policy "catalog read products" on public.products
for select to anon, authenticated using (is_active = true or public.is_admin());
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog read product images" on public.product_images;
create policy "catalog read product images" on public.product_images
for select to anon, authenticated using (true);
drop policy if exists "admin manage product images" on public.product_images;
create policy "admin manage product images" on public.product_images
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog read product variants" on public.product_variants;
create policy "catalog read product variants" on public.product_variants
for select to anon, authenticated using (true);
drop policy if exists "admin manage product variants" on public.product_variants;
create policy "admin manage product variants" on public.product_variants
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Хэрэглэгч зөвхөн өөрийн профайлыг уншиж, хадгална; admin бүх профайлыг уншина.
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
for insert to authenticated with check (id = auth.uid());
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Сагсны мөр бүр зөвхөн тухайн хэрэглэгчид харагдана.
drop policy if exists "users manage own cart" on public.cart_items;
create policy "users manage own cart" on public.cart_items
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Захиалгыг эзэмшигч нь уншиж, үүсгэнэ; admin уншиж, төлөв өөрчилнө.
drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users create own orders" on public.orders;
create policy "users create own orders" on public.orders
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items
for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);
drop policy if exists "users create own order items" on public.order_items;
create policy "users create own order items" on public.order_items
for insert to authenticated with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);

-- Review-г хүн бүр уншина; хэрэглэгч зөвхөн өөрийн review-г удирдана.
drop policy if exists "anyone reads reviews" on public.reviews;
create policy "anyone reads reviews" on public.reviews
for select to anon, authenticated using (true);
drop policy if exists "users manage own reviews" on public.reviews;
create policy "users manage own reviews" on public.reviews
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Browser ашиглах role-уудад шаардлагатай хүснэгтийн эрхүүдийг олгоно.
grant select on public.categories, public.products, public.product_images,
  public.product_variants, public.reviews to anon, authenticated;
grant insert, update, delete on public.profiles, public.cart_items, public.orders,
  public.order_items, public.reviews to authenticated;
grant insert, update, delete on public.categories, public.products,
  public.product_images, public.product_variants to authenticated;

-- Барааны зургууд хадгалах public bucket-ийг нэг удаа үүсгэнэ.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read product images bucket" on storage.objects;
create policy "public read product images bucket" on storage.objects
for select to public using (bucket_id = 'product-images');

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'product-images' and public.is_admin()
);

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects
for update to authenticated using (
  bucket_id = 'product-images' and public.is_admin()
) with check (
  bucket_id = 'product-images' and public.is_admin()
);

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects
for delete to authenticated using (
  bucket_id = 'product-images' and public.is_admin()
);

-- Ангиллын анхны бодит мөрүүдийг зөвхөн байхгүй үед нэмнэ.
insert into public.categories (name, gender, description)
select item.name, item.gender, item.description
from (values
  ('T-Shirt', 'Unisex', 'Өдөр тутмын цамц'),
  ('Hoodie', 'Unisex', 'Малгайтай цамц'),
  ('Pants', 'Unisex', 'Өмд'),
  ('Jacket', 'Unisex', 'Хүрэм'),
  ('Accessories', 'Unisex', 'Аксессуар')
) as item(name, gender, description)
where not exists (
  select 1 from public.categories existing where existing.name = item.name
);
