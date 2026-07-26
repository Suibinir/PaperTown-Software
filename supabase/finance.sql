-- Finance Module
-- Run in Supabase SQL Editor

-- Finance settings (extends agency_settings)
alter table agency_settings
  add column if not exists currency text default 'USD',
  add column if not exists tax_rate numeric default 25,
  add column if not exists vat_rate numeric default 15,
  add column if not exists pay_terms integer default 30,
  add column if not exists inv_prefix text default 'INV',
  add column if not exists next_inv_num integer default 1001,
  add column if not exists inv_note text,
  add column if not exists late_fee numeric default 1.5,
  add column if not exists agency_phone text,
  add column if not exists agency_email text,
  add column if not exists agency_website text,
  add column if not exists agency_address text;

-- Invoices
create table if not exists invoices (
  id text primary key,  -- INV-1001 format
  client_id uuid references clients(id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  status text default 'draft' check (status in ('draft','pending','paid','overdue','cancelled')),
  pay_type text default 'final' check (pay_type in ('final','advance')),
  advance_pct integer default 50,
  lines jsonb not null default '[]',
  subtotal numeric default 0,
  vat numeric default 0,
  total numeric default 0,
  amount_due numeric default 0,
  notes text,
  txn_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table invoices enable row level security;
create policy "Team full access invoices" on invoices for all using (true);

create trigger invoices_updated before update on invoices
  for each row execute procedure update_updated_at();

-- Expenses
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  description text not null,
  category text,
  vendor_id uuid,
  client_id uuid references clients(id) on delete set null,
  amount numeric not null default 0,
  receipt_url text,
  notes text,
  created_at timestamptz default now()
);

alter table expenses enable row level security;
create policy "Team full access expenses" on expenses for all using (true);

-- Vendors
create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  email text,
  phone text,
  terms text default 'Net 30',
  ytd numeric default 0,
  outstanding numeric default 0,
  created_at timestamptz default now()
);

alter table vendors enable row level security;
create policy "Team full access vendors" on vendors for all using (true);

-- Staff / Payroll
create table if not exists staff (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text,
  email text,
  salary numeric default 0,
  start_date date,
  active boolean default true,
  created_at timestamptz default now()
);

alter table staff enable row level security;
create policy "Team full access staff" on staff for all using (true);
