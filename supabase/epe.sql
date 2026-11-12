-- /epe sınıf sıralaması (Supabase projesi: epe).
-- Tabloya anonim erişim yok; sayfa yalnızca aşağıdaki üç fonksiyonu çağırır.
-- Herkes sadece ad + ortalama + sıra görür; tek tek notlar (notlar sütunu) dışarı verilmez.
-- Bir ismi yalnızca onu ilk kaydeden tarayıcı (gizli anahtarı localStorage'da) güncelleyebilir ya da silebilir.

create extension if not exists pgcrypto with schema extensions;

create table public.ogrenciler (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (char_length(ad) between 2 and 40),
  token_hash text not null,
  grup text not null default '501' check (grup in ('501', '401')),
  notlar jsonb not null default '[]'::jsonb,
  ortalama numeric(5, 2) not null check (ortalama between 0 and 100),
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);

create unique index ogrenciler_ad_tekil on public.ogrenciler (lower(ad));

alter table public.ogrenciler enable row level security;
revoke all on public.ogrenciler from anon, authenticated;

-- Kaydet ya da güncelle. İsim boştaysa yeni kayıt; doluysa anahtar tutmalı.
create or replace function public.mt_kaydet(p_ad text, p_token text, p_grup text, p_notlar jsonb, p_ortalama numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ad text := regexp_replace(btrim(p_ad), '\s+', ' ', 'g');
  v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_mevcut public.ogrenciler;
begin
  if char_length(coalesce(p_token, '')) < 20 then
    raise exception 'gecersiz_anahtar';
  end if;
  if jsonb_typeof(p_notlar) <> 'array' or jsonb_array_length(p_notlar) > 40 then
    raise exception 'gecersiz_notlar';
  end if;

  select * into v_mevcut from public.ogrenciler where lower(ad) = lower(v_ad);

  if v_mevcut.id is null then
    if (select count(*) from public.ogrenciler) >= 300 then
      raise exception 'kapasite_dolu';
    end if;
    insert into public.ogrenciler (ad, token_hash, grup, notlar, ortalama)
    values (v_ad, v_hash, p_grup, p_notlar, round(p_ortalama, 2));
  elsif v_mevcut.token_hash = v_hash then
    update public.ogrenciler
       set ad = v_ad, grup = p_grup, notlar = p_notlar, ortalama = round(p_ortalama, 2), guncelleme = now()
     where id = v_mevcut.id;
  else
    raise exception 'isim_alinmis';
  end if;
end;
$$;

-- Sıralama: ad, ortalama, sıra. Notlar dönmez.
create or replace function public.mt_siralama(p_grup text default '501')
returns table (sira bigint, ad text, ortalama numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by o.ortalama desc) as sira, o.ad, o.ortalama
    from public.ogrenciler o
   where o.grup = p_grup
   order by o.ortalama desc, o.ad;
$$;

-- Kendini sıralamadan çıkar.
create or replace function public.mt_sil(p_ad text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  delete from public.ogrenciler
   where lower(ad) = lower(btrim(p_ad))
     and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.mt_kaydet(text, text, text, jsonb, numeric) from public;
revoke all on function public.mt_siralama(text) from public;
revoke all on function public.mt_sil(text, text) from public;
grant execute on function public.mt_kaydet(text, text, text, jsonb, numeric) to anon, authenticated;
grant execute on function public.mt_siralama(text) to anon, authenticated;
grant execute on function public.mt_sil(text, text) to anon, authenticated;

-- Yapay zeka asistanı (edge function epe-ai, supabase/functions/epe-ai) için günlük kullanım sınırı.
-- Yalnızca edge function (service_role) çağırır; kişi IP özetiyle tutulur, ham IP saklanmaz.
create table public.ai_kullanim (
  gun date not null default (now() at time zone 'Europe/Istanbul')::date,
  anahtar text not null,
  sayi int not null default 0,
  primary key (gun, anahtar)
);
alter table public.ai_kullanim enable row level security;
revoke all on public.ai_kullanim from anon, authenticated;

create or replace function public.ai_hak(p_kisi text, p_kisi_sinir int, p_toplam_sinir int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gun date := (now() at time zone 'Europe/Istanbul')::date;
  v_kisi int;
  v_toplam int;
begin
  insert into public.ai_kullanim (gun, anahtar, sayi) values (v_gun, '*', 1)
  on conflict (gun, anahtar) do update set sayi = public.ai_kullanim.sayi + 1
  returning sayi into v_toplam;
  insert into public.ai_kullanim (gun, anahtar, sayi) values (v_gun, p_kisi, 1)
  on conflict (gun, anahtar) do update set sayi = public.ai_kullanim.sayi + 1
  returning sayi into v_kisi;
  delete from public.ai_kullanim where gun < v_gun - 7;
  return v_kisi <= p_kisi_sinir and v_toplam <= p_toplam_sinir;
end;
$$;

revoke all on function public.ai_hak(text, int, int) from public, anon, authenticated;
grant execute on function public.ai_hak(text, int, int) to service_role;
