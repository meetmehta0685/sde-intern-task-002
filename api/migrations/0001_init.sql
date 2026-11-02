-- Schema for the shared bill splitter.
-- Every constraint is named so a failure points at the rule that was broken.
-- D1 enforces foreign keys by default.

CREATE TABLE homes (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  CONSTRAINT homes_pk PRIMARY KEY (id),
  CONSTRAINT homes_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE TABLE members (
  id TEXT NOT NULL,
  home_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- 0, 1, 2, ... in the order members joined the home. Decides who gets the extra cents.
  position INTEGER NOT NULL,
  CONSTRAINT members_pk PRIMARY KEY (id),
  CONSTRAINT members_home_fk FOREIGN KEY (home_id) REFERENCES homes (id),
  CONSTRAINT members_home_position_unique UNIQUE (home_id, position),
  CONSTRAINT members_position_non_negative CHECK (position >= 0),
  CONSTRAINT members_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE TABLE bills (
  id TEXT NOT NULL,
  home_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  CONSTRAINT bills_pk PRIMARY KEY (id),
  CONSTRAINT bills_home_fk FOREIGN KEY (home_id) REFERENCES homes (id),
  CONSTRAINT bills_total_positive_integer CHECK (typeof(total_cents) = 'integer' AND total_cents > 0),
  CONSTRAINT bills_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE INDEX bills_home_idx ON bills (home_id);

CREATE TABLE shares (
  id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  paid_at TEXT,
  -- The Idempotency-Key of the request that paid this share.
  idempotency_key TEXT,
  CONSTRAINT shares_pk PRIMARY KEY (id),
  CONSTRAINT shares_bill_fk FOREIGN KEY (bill_id) REFERENCES bills (id),
  CONSTRAINT shares_member_fk FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT shares_bill_member_unique UNIQUE (bill_id, member_id),
  -- A share can be 0 when the total is smaller than the number of members.
  CONSTRAINT shares_amount_non_negative_integer CHECK (typeof(amount_cents) = 'integer' AND amount_cents >= 0),
  -- A share is either unpaid (both NULL) or paid by exactly one request (both set).
  CONSTRAINT shares_paid_has_key CHECK ((paid_at IS NULL) = (idempotency_key IS NULL))
);

CREATE INDEX shares_member_idx ON shares (member_id);
