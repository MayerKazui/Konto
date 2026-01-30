-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ACCOUNTS
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  type text not null, -- 'checking', 'savings', etc.
  include_in_total boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for Accounts
alter table accounts enable row level security;

create policy "Users can view their own accounts"
on accounts for select
using (auth.uid() = user_id);

create policy "Users can insert their own accounts"
on accounts for insert
with check (auth.uid() = user_id);

create policy "Users can update their own accounts"
on accounts for update
using (auth.uid() = user_id);

create policy "Users can delete their own accounts"
on accounts for delete
using (auth.uid() = user_id);


-- TRANSACTIONS
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  account_id uuid references accounts(id) on delete cascade not null,
  amount numeric not null,
  type text not null, -- 'income' | 'expense'
  date date not null,
  description text,
  is_recurring boolean default false,
  recurring_id uuid, -- Reference to recurring_transactions(id) manually
  is_transfer boolean default false,
  linked_transaction_id uuid, -- Reference to another transaction(id) manually
  to_account_id uuid, -- Optional, for redundancy/easier querying of transfers
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for Transactions
alter table transactions enable row level security;

create policy "Users can view their own transactions"
on transactions for select
using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
on transactions for insert
with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
on transactions for update
using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
on transactions for delete
using (auth.uid() = user_id);


-- RECURRING TRANSACTIONS
create table recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  account_id uuid references accounts(id) on delete cascade not null,
  to_account_id uuid, -- For recurring transfers
  amount numeric not null,
  type text not null,
  description text,
  frequency text not null, -- 'daily', 'weekly', etc.
  start_date date not null,
  next_due_date date not null,
  end_date date,
  active boolean default true,
  is_transfer boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for Recurring Transactions
alter table recurring_transactions enable row level security;

create policy "Users can view their own recurring transactions"
on recurring_transactions for select
using (auth.uid() = user_id);

create policy "Users can insert their own recurring transactions"
on recurring_transactions for insert
with check (auth.uid() = user_id);

create policy "Users can update their own recurring transactions"
on recurring_transactions for update
using (auth.uid() = user_id);

create policy "Users can delete their own recurring transactions"
on recurring_transactions for delete
using (auth.uid() = user_id);


-- ACCOUNT GROUPS
create table account_groups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  account_ids text[], -- Array of UUIDs stored as text or UUID
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for Account Groups
alter table account_groups enable row level security;

create policy "Users can view their own account groups"
on account_groups for select
using (auth.uid() = user_id);

create policy "Users can insert their own account groups"
on account_groups for insert
with check (auth.uid() = user_id);

create policy "Users can update their own account groups"
on account_groups for update
using (auth.uid() = user_id);

create policy "Users can delete their own account groups"
on account_groups for delete
using (auth.uid() = user_id);
