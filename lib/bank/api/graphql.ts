import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/bank/funcs';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A number of bytes. 64-bit, unlike Int: serialized as a JSON number, and accepted as a number or a numeric string. */
  ByteCount: { input: any; output: any; }
  /** Date (isoformat) */
  Date: { input: string; output: string; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  /** Decimal (fixed-point) */
  Decimal: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** Everything about one account over a window. */
export type AccountInsights = {
  __typename?: 'AccountInsights';
  account: BankAccount;
  averageBalance: Array<CurrencyTotal>;
  highestBalance?: Maybe<BalanceExtreme>;
  largestIn: Array<Transaction>;
  largestOut: Array<Transaction>;
  lowestBalance?: Maybe<BalanceExtreme>;
  monthly: Array<CashflowBucket>;
  topCategories: Array<RankedCategory>;
  topMerchants: Array<RankedMerchant>;
  totals: Array<MoneyTotals>;
  window: WindowInfo;
};

/** What an account holds. A DEPOT's balance is its market valuation; its positions are `holdings`. */
export enum AccountKind {
  Cash = 'CASH',
  Depot = 'DEPOT',
  Savings = 'SAVINGS'
}

/** An account finished syncing. */
export type AccountSyncEvent = {
  __typename?: 'AccountSyncEvent';
  accountId: Scalars['ID']['output'];
  created: Scalars['Int']['output'];
  pendingReplaced: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

/** One way an account is pulled from a provider (an Enable Banking account, a Scalable pot). Lease, daily budget and last outcome are per syncer. */
export type AccountSyncer = {
  __typename?: 'AccountSyncer';
  /** The account it feeds. */
  account: BankAccount;
  /** Which provider it pulls from. */
  backend: Provider;
  /** The consent or login it is reached through; null once that is deleted. */
  connection?: Maybe<BankConnection>;
  /** When the syncer was first linked. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** True while a sync holds the syncer. */
  isSyncing: Scalars['Boolean']['output'];
  /** Why the last sync failed, if it did. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The kind of `lastError`, for the client to offer a fix. */
  lastErrorCode?: Maybe<BankErrorCode>;
  /** When the last successful sync finished. */
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The earliest this syncer may sync (null: now) — after today's budget is spent or the provider asked to wait. */
  nextSyncAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Syncs left today under the provider's daily limit (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
};

/** How much of the depot one security type is. */
export type Allocation = {
  __typename?: 'Allocation';
  currency: Scalars['String']['output'];
  securityType: Scalars['String']['output'];
  share: Scalars['Float']['output'];
  valuation: Scalars['Decimal']['output'];
};

/** Apply a previewed import. */
export type ApplyStatementImportInput = {
  /** Choices for accounts of the file; the others go where the preview said (an AMBIGUOUS one needs a choice). */
  accounts?: InputMaybe<Array<ImportAccountChoice>>;
  id: Scalars['ID']['input'];
};

/** A map area: a circle (`near`) or a viewport (`within`) — give one. */
export type AreaInput = {
  near?: InputMaybe<NearInput>;
  within?: InputMaybe<BoundsInput>;
};

/** Spending at located places inside a map area. */
export type AreaInsights = {
  __typename?: 'AreaInsights';
  categories: Array<RankedCategory>;
  locations: Array<RankedLocation>;
  merchants: Array<RankedMerchant>;
  monthly: Array<CashflowBucket>;
  totals: Array<MoneyTotals>;
  window: WindowInfo;
};

/** Link transactions to a merchant (and place) by hand — MANUAL, never re-matched. A null `merchant` hands them back to alias matching. */
export type AssignMerchantInput = {
  /** Create the place when `location.storeCode` is new for the merchant. */
  createLocation?: Scalars['Boolean']['input'];
  /** By id or store number (created if new, see `createLocation`). */
  location?: InputMaybe<LocationRef>;
  /** By id or key; null clears the manual link. */
  merchant?: InputMaybe<MerchantRef>;
  transactions: Array<Scalars['ID']['input']>;
};

/** How a started login finishes. */
export enum AuthFinish {
  Poll = 'POLL',
  Redirect = 'REDIRECT'
}

/** A started (or resumed) login, the same shape for every provider. Open `openUrl` in the user's browser; then, by `finish`: REDIRECT — the provider redirects to `redirectUrl` with `code` and `state`, call `completeBankLink`; POLL — call `completeScalableLink(state)` every `interval` seconds until the connection is ACTIVE. `state` is stored server-side, so any replica completes it and `resumeLink` returns it again. */
export type AuthSession = {
  __typename?: 'AuthSession';
  connection: BankConnection;
  expiresAt: Scalars['DateTime']['output'];
  finish: AuthFinish;
  /** POLL only: seconds between complete calls. */
  interval?: Maybe<Scalars['Int']['output']>;
  openUrl: Scalars['String']['output'];
  /** REDIRECT only: where the provider sends the browser back to. */
  redirectUrl?: Maybe<Scalars['String']['output']>;
  state: Scalars['String']['output'];
  /** POLL only: the code the user checks on the provider's page. */
  userCode?: Maybe<Scalars['String']['output']>;
};

/** An end-of-day balance. */
export type BalanceExtreme = {
  __typename?: 'BalanceExtreme';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
};

/** An end-of-day account balance. */
export type BalancePoint = {
  __typename?: 'BalancePoint';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
  /** True if the bank reported this balance; false if derived from transactions. */
  reported: Scalars['Boolean']['output'];
};

/** An account balance as the bank reported it on a day. */
export type BalanceSnapshot = {
  __typename?: 'BalanceSnapshot';
  /** The account. */
  account: BankAccount;
  /** The balance. */
  amount: Scalars['Decimal']['output'];
  /** The ISO 20022 balance type (CLBD closing booked, ITAV interim available, …). */
  balanceType: Scalars['String']['output'];
  /** ISO currency of the balance. */
  currency: Scalars['String']['output'];
  /** The day the balance refers to. */
  date: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
};

/** An account. Keeps its history across relinks; fed by its syncers and by imports. */
export type BankAccount = {
  __typename?: 'BankAccount';
  /** Every balance the bank reported, one per day and type. */
  balances: Array<BalanceSnapshot>;
  /** The connection of the account's live syncer (else of its newest one); null for an account fed only by imports. */
  connection?: Maybe<BankConnection>;
  /** When the account was first seen. */
  createdAt: Scalars['DateTime']['output'];
  /** The account's ISO currency. */
  currency: Scalars['String']['output'];
  /** A depot's positions as of its latest sync (empty for other accounts). */
  currentHoldings: Array<HoldingSnapshot>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** The account's IBAN, if known. */
  iban?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** True when no live syncer pulls the account (no connection, or only expired/revoked ones): it grows by imports only. */
  isImportOnly: Scalars['Boolean']['output'];
  /** True while a sync holds one of the account's syncers. */
  isSyncing: Scalars['Boolean']['output'];
  /** Cash, securities depot, or savings. */
  kind: AccountKind;
  /** Why the last sync of a syncer failed, if one did. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The kind of `lastError`, for the client to offer a fix. */
  lastErrorCode?: Maybe<BankErrorCode>;
  /** When the last successful sync of any syncer finished. */
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The newest balance the bank reported, of the most authoritative type. */
  latestBalance?: Maybe<BalanceSnapshot>;
  /** The account's name at the bank. */
  name?: Maybe<Scalars['String']['output']>;
  /** The earliest every live syncer may sync (null: now) — after today's budget is spent or the provider asked to wait. Syncing earlier fails with RATE_LIMITED without contacting the provider. */
  nextSyncAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The organization this account belongs to. */
  organization: Organization;
  /** The bank's product name for the account. */
  product?: Maybe<Scalars['String']['output']>;
  /** How the account is pulled from providers; empty for an account fed only by imports. */
  syncers: Array<AccountSyncer>;
  /** The fewest syncs any live syncer has left today (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
  /** The account's transactions. */
  transactions: Array<Transaction>;
};


/** An account. Keeps its history across relinks; fed by its syncers and by imports. */
export type BankAccountTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/**
 * An account: its identity, and the history of every syncer and import that fed it.
 *
 * What reaches the account at a provider lives on its :class:`AccountSyncer` rows (one per
 * provider identity); an account with no syncer is fed only by imports (a bank that is no
 * longer linked). A relink re-attaches the same account — by the syncer's identity, else by
 * IBAN — so the history, categories and notes stay.
 */
export type BankAccountFilter = {
  AND?: InputMaybe<BankAccountFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BankAccountFilter>;
  OR?: InputMaybe<BankAccountFilter>;
  connection?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<AccountKind>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type BankAccountOrder =
  { createdAt: Ordering; currency?: never; kind?: never; lastSyncedAt?: never; name?: never; }
  |  { createdAt?: never; currency: Ordering; kind?: never; lastSyncedAt?: never; name?: never; }
  |  { createdAt?: never; currency?: never; kind: Ordering; lastSyncedAt?: never; name?: never; }
  |  { createdAt?: never; currency?: never; kind?: never; lastSyncedAt: Ordering; name?: never; }
  |  { createdAt?: never; currency?: never; kind?: never; lastSyncedAt?: never; name: Ordering; };

/** One consent at one bank. Accounts are synced through it while it is ACTIVE. */
export type BankConnection = {
  __typename?: 'BankConnection';
  /** The accounts reached through this connection (through their syncers). */
  accounts: Array<BankAccount>;
  /** The bank's ISO country code. */
  aspspCountry: Scalars['String']['output'];
  /** The bank's name, exactly as Enable Banking lists it. */
  aspspName: Scalars['String']['output'];
  /** When the link was started. */
  createdAt: Scalars['DateTime']['output'];
  /** The user who started the link. */
  creator?: Maybe<User>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  /** PENDING and past `pendingExpiresAt`: the login can no longer be completed. */
  isAbandoned: Scalars['Boolean']['output'];
  /** The last error talking to the bank, if any. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The kind of `lastError`, for the client to offer a fix. */
  lastErrorCode?: Maybe<BankErrorCode>;
  /** Where a Scalable link is in its login. */
  linkStep?: Maybe<LinkStep>;
  /** When the link was completed. */
  linkedAt?: Maybe<Scalars['DateTime']['output']>;
  /** True when the consent ran out or was withdrawn: start a new link to the same bank to continue. */
  needsReauth: Scalars['Boolean']['output'];
  /** The earliest every account of the connection may sync again (null: now). `syncConnection` needs all of them. */
  nextSyncAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The organization this connection belongs to. */
  organization: Organization;
  /** PENDING only: when the login can no longer be completed. Nothing flips it on a timer — past this, a PENDING link is dead: hide it or `cancelLink` it. */
  pendingExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who the accounts are reached through. */
  provider: Provider;
  /** Where this consent is in its lifecycle. */
  status: ConnectionStatus;
  /** The syncers reached through this connection. */
  syncers: Array<AccountSyncer>;
  /** The fewest syncs any account of the connection has left today (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
  /** When the bank consent runs out. */
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};

/**
 * One consent at one bank (an Enable Banking session) or one Scalable Capital login.
 *
 * A Scalable connection keeps its credentials — the DPoP private key and the rotating refresh
 * token bound to it — Fernet-encrypted in ``secret`` (see :mod:`finance.scalable.crypto`).
 */
export type BankConnectionFilter = {
  AND?: InputMaybe<BankConnectionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BankConnectionFilter>;
  OR?: InputMaybe<BankConnectionFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  status?: InputMaybe<ConnectionStatus>;
};

/** What went wrong, so a client can offer the fix: CONSENT_EXPIRED → relink, RATE_LIMITED → try again at nextSyncAllowedAt, MFA_REJECTED → log in again, CODE_EXPIRED → get a new code, INVALID_STATE → start over, BANK_UNAVAILABLE → try later. Also every GraphQL error's `extensions.code`. */
export enum BankErrorCode {
  BankError = 'BANK_ERROR',
  BankUnavailable = 'BANK_UNAVAILABLE',
  CodeExpired = 'CODE_EXPIRED',
  ConnectionInactive = 'CONNECTION_INACTIVE',
  ConsentExpired = 'CONSENT_EXPIRED',
  InvalidState = 'INVALID_STATE',
  MfaRejected = 'MFA_REJECTED',
  NotConfigured = 'NOT_CONFIGURED',
  RateLimited = 'RATE_LIMITED',
  SyncInProgress = 'SYNC_IN_PROGRESS'
}

/** Temporary S3 credentials for reading a big file. */
export type BigFileAccessGrant = {
  __typename?: 'BigFileAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

/** A BigFileStore represents a large object stored behind the S3 datalayer. */
export type BigFileStore = {
  __typename?: 'BigFileStore';
  /** Get temporary S3 read credentials for the object. */
  accessGrant: BigFileAccessGrant;
  /** The datalayer bucket/service this store belongs to. */
  bucket: Scalars['String']['output'];
  /** The client-provided content type for the uploaded file. */
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The object key/path within the datalayer bucket. */
  key: Scalars['String']['output'];
  /** The original client-provided file name. */
  originalFileName?: Maybe<Scalars['String']['output']>;
  /** The object-store URI of the file */
  path: Scalars['String']['output'];
  presignedUrl: Scalars['String']['output'];
  /** How many bytes this store actually holds, measured when its upload was finished. Null while unfinished, or for stores written before this was recorded */
  sizeBytes?: Maybe<Scalars['ByteCount']['output']>;
};


/** A BigFileStore represents a large object stored behind the S3 datalayer. */
export type BigFileStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** Temporary S3 credentials for uploading a big file. */
export type BigFileUploadGrant = {
  __typename?: 'BigFileUploadGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['ByteCount']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
  uploadFormField: Scalars['String']['output'];
};

/** A map viewport: the WGS84 box between south/north latitudes and west/east longitudes. */
export type BoundsInput = {
  east: Scalars['Float']['input'];
  north: Scalars['Float']['input'];
  south: Scalars['Float']['input'];
  west: Scalars['Float']['input'];
};

/** A monthly spending limit for a category and its children, in one currency. */
export type Budget = {
  __typename?: 'Budget';
  /** The monthly limit, as a positive amount. */
  amount: Scalars['Decimal']['output'];
  /** The budgeted category; child categories count towards it. */
  category: Category;
  /** When the budget was created. */
  createdAt: Scalars['DateTime']['output'];
  /** ISO currency of the limit; only transactions in it count. */
  currency: Scalars['String']['output'];
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** Last month the budget applies to, or open-ended. */
  endMonth?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  /** First month the budget applies to (the first day of it). */
  startMonth: Scalars['Date']['output'];
};

/** A monthly spending limit for a category (and its children), in one currency. */
export type BudgetFilter = {
  AND?: InputMaybe<BudgetFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BudgetFilter>;
  OR?: InputMaybe<BudgetFilter>;
  activeIn?: InputMaybe<Scalars['Date']['input']>;
  category?: InputMaybe<Scalars['ID']['input']>;
};

export type BudgetOrder =
  { amount: Ordering; createdAt?: never; startMonth?: never; }
  |  { amount?: never; createdAt: Ordering; startMonth?: never; }
  |  { amount?: never; createdAt?: never; startMonth: Ordering; };

/** One budget in one month. */
export type BudgetStatus = {
  __typename?: 'BudgetStatus';
  budget: Budget;
  budgeted: Scalars['Decimal']['output'];
  month: Scalars['Date']['output'];
  /** spent / budgeted. */
  ratio: Scalars['Float']['output'];
  /** Negative when over budget. */
  remaining: Scalars['Decimal']['output'];
  /** Net money out in the category and its children, as a positive amount. */
  spent: Scalars['Decimal']['output'];
};

/** Money in and out during one month or week, in one currency. */
export type CashflowBucket = {
  __typename?: 'CashflowBucket';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money out, as a positive amount. */
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
  periodStart: Scalars['Date']['output'];
};

/** Set or clear a transaction's category. */
export type CategorizeTransactionInput = {
  /** The category; null clears it and lets the rules decide again. */
  category?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};

/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type Category = {
  __typename?: 'Category';
  /** Uncategorized (or semantically guessed) transactions that look like they belong here, closest first: close to what the organization put in this category, or to one of its terms. */
  candidates: Array<Transaction>;
  /** The parent category, if nested. */
  children: Array<Category>;
  /** A display color (e.g. ``#4f46e5``). */
  color?: Maybe<Scalars['String']['output']>;
  /** When the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** What belongs here, in words bank lines use. Each comma-separated phrase is a term the category is recognized by. */
  description: Scalars['String']['output'];
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** Hidden from pickers, suggestions and automatic assignment. */
  hidden: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** True for a base category (it has a `key`); it stays fully editable. */
  isBase: Scalars['Boolean']['output'];
  /** The base-taxonomy key (`food.groceries`) of a base category; null for the organization's own. */
  key?: Maybe<Scalars['String']['output']>;
  /** Expense, income or transfer — always the root's kind, for the whole subtree. */
  kind: CategoryKind;
  /** The category's name, unique among its siblings. */
  name: Scalars['String']['output'];
  /** The organization this category belongs to. */
  organization: Organization;
  /** The parent category, if nested. */
  parent?: Maybe<Category>;
  /** The category matching transactions get. */
  rules: Array<CategoryRule>;
  /** The phrases this category is recognized by: its name and each phrase of its description. */
  terms: Array<Scalars['String']['output']>;
};


/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type CategoryCandidatesArgs = {
  limit?: Scalars['Int']['input'];
};


/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type CategoryChildrenArgs = {
  filters?: InputMaybe<CategoryFilter>;
  ordering?: Array<CategoryOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type CategoryRulesArgs = {
  filters?: InputMaybe<CategoryRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** What a category commits per month in recurring payments. */
export type CategoryCommitment = {
  __typename?: 'CategoryCommitment';
  category?: Maybe<Category>;
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money per month (positive for payments out). */
  monthly: Scalars['Decimal']['output'];
};

/** What deleting a category does (or did): counted over the category and its children. */
export type CategoryDeletion = {
  __typename?: 'CategoryDeletion';
  /** Budgets on them (deleted with them). */
  budgets: Scalars['Int']['output'];
  /** The category and its descendants. */
  categories: Scalars['Int']['output'];
  /** Base categories among them; they are not re-added by syncBaseCategories until restored. */
  dismissedBaseKeys: Array<Scalars['String']['output']>;
  /** Rules assigning them (deleted with them). */
  rules: Scalars['Int']['output'];
  /** Transactions in them: reassigned, or handed back to rules and suggestions. */
  transactions: Scalars['Int']['output'];
};

/**
 * A spending or income category. Categories nest (groceries under food).
 *
 * A category's ``kind`` is always its root's: the whole subtree is expense, income or
 * transfer, so stats and budgets never disagree about a child. Base categories carry the
 * ``key`` of their node in :mod:`finance.taxonomy`; everything about them stays editable.
 * Name + description are embedded, which is what lets a never-seen merchant land in the
 * right category (:mod:`finance.semantic`).
 */
export type CategoryFilter = {
  AND?: InputMaybe<CategoryFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CategoryFilter>;
  OR?: InputMaybe<CategoryFilter>;
  base?: InputMaybe<Scalars['Boolean']['input']>;
  hidden?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<CategoryKind>;
  roots?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by text: a substring of name or description, or semantic similarity to both. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Everything about one category (children rolled up) over a window. */
export type CategoryInsights = {
  __typename?: 'CategoryInsights';
  /** This month's status of budgets on it. */
  budgets: Array<BudgetStatus>;
  category: Category;
  changes: Array<Change>;
  children: Array<RankedCategory>;
  monthly: Array<CashflowBucket>;
  /** Totals divided by the months in the window (`count` is the number of months). */
  monthlyAverage: Array<MoneyTotals>;
  previous: Array<MoneyTotals>;
  /** Its part of all expense. */
  shareOfSpending: Array<Share>;
  tickets: Array<TicketStats>;
  topCounterparties: Array<CounterpartyTotal>;
  topMerchants: Array<RankedMerchant>;
  totals: Array<MoneyTotals>;
  window: WindowInfo;
};

/** Whether a category holds expenses, income, or transfers between own accounts (excluded from stats). */
export enum CategoryKind {
  Expense = 'EXPENSE',
  Income = 'INCOME',
  Transfer = 'TRANSFER'
}

/** A category that moved most against the comparison window. */
export type CategoryMove = {
  __typename?: 'CategoryMove';
  category?: Maybe<Category>;
  change: Change;
};

export type CategoryOrder =
  { createdAt: Ordering; kind?: never; name?: never; }
  |  { createdAt?: never; kind: Ordering; name?: never; }
  |  { createdAt?: never; kind?: never; name: Ordering; };

/** Assigns a category to matching transactions; the first active rule by priority wins. */
export type CategoryRule = {
  __typename?: 'CategoryRule';
  /** Inactive rules are skipped. */
  active: Scalars['Boolean']['output'];
  /** Only match when the absolute amount is at most this. */
  amountMax?: Maybe<Scalars['Decimal']['output']>;
  /** Only match when the absolute amount is at least this. */
  amountMin?: Maybe<Scalars['Decimal']['output']>;
  /** The category matching transactions get. */
  category: Category;
  /** When the rule was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Only match money in, money out, or both. */
  direction: RuleDirection;
  /** The transaction field the pattern is matched against. */
  field: RuleField;
  id: Scalars['ID']['output'];
  /** How the pattern is compared (case-insensitive). */
  match: RuleMatch;
  /** The text or regular expression to match. */
  pattern: Scalars['String']['output'];
  /** Lower runs first; the first matching rule wins. */
  priority: Scalars['Int']['output'];
};

/** Assigns a category to matching transactions on import (never to manually categorized ones). */
export type CategoryRuleFilter = {
  AND?: InputMaybe<CategoryRuleFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CategoryRuleFilter>;
  OR?: InputMaybe<CategoryRuleFilter>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['ID']['input']>;
};

/** Who set a transaction's category: a rule, a user (MANUAL — nothing overrides it), or SEMANTIC (similar categorized transactions or a category term agreed; rules and users override it). */
export enum CategorySource {
  Import = 'IMPORT',
  Manual = 'MANUAL',
  Merchant = 'MERCHANT',
  None = 'NONE',
  Rule = 'RULE',
  Semantic = 'SEMANTIC'
}

/** A likely category for a transaction. */
export type CategorySuggestion = {
  __typename?: 'CategorySuggestion';
  category: Category;
  /** Up to three of those transactions. */
  evidence: Array<Transaction>;
  /** How many similar categorized transactions voted for it. */
  neighbours: Scalars['Int']['output'];
  reason: SuggestionReason;
  /** The category's share (0–1) of all votes; above the auto-assign threshold with evidence, sync assigns it (source SEMANTIC). */
  score: Scalars['Float']['output'];
};

/** Money in and out of one category, in one currency. `category` is null for uncategorized transactions. */
export type CategoryTotal = {
  __typename?: 'CategoryTotal';
  category?: Maybe<Category>;
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money out, as a positive amount. */
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
};

/** How one metric moved against the comparison window. */
export type Change = {
  __typename?: 'Change';
  currency: Scalars['String']['output'];
  current: Scalars['Decimal']['output'];
  /** current − previous. */
  delta: Scalars['Decimal']['output'];
  metric: StatMetric;
  previous: Scalars['Decimal']['output'];
  /** delta / previous; null when previous is zero. */
  ratio?: Maybe<Scalars['Float']['output']>;
};

/** What a view compares its window with. */
export enum Comparison {
  None = 'NONE',
  PreviousPeriod = 'PREVIOUS_PERIOD',
  SamePeriodLastYear = 'SAME_PERIOD_LAST_YEAR'
}

/** Finish a bank link with what the bank redirected back with. */
export type CompleteBankLinkInput = {
  /** The `code` query parameter of the redirect. */
  code: Scalars['String']['input'];
  /** The `state` query parameter of the redirect. */
  state: Scalars['String']['input'];
};

/** Lifecycle of a bank consent. */
export enum ConnectionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Revoked = 'REVOKED'
}

/** Money to or from one counterparty, in one currency. */
export type CounterpartyTotal = {
  __typename?: 'CounterpartyTotal';
  count: Scalars['Int']['output'];
  counterparty: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  /** As a positive amount. */
  total: Scalars['Decimal']['output'];
};

/** A new monthly budget. */
export type CreateBudgetInput = {
  /** The monthly limit, positive. */
  amount: Scalars['Decimal']['input'];
  category: Scalars['ID']['input'];
  currency?: Scalars['String']['input'];
  /** Any day of the last month; open-ended by default. */
  endMonth?: InputMaybe<Scalars['Date']['input']>;
  /** Any day of the first month; the current month by default. */
  startMonth?: InputMaybe<Scalars['Date']['input']>;
};

/** A new category. Under a parent it takes the parent's kind (a subtree is one kind). */
export type CreateCategoryInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  /** What belongs here, in words bank lines use (merchants, keywords; commas separate terms). Drives suggestions. */
  description?: Scalars['String']['input'];
  hidden?: Scalars['Boolean']['input'];
  /** For a top-level category; a child always takes its parent's kind. */
  kind?: CategoryKind;
  name: Scalars['String']['input'];
  parent?: InputMaybe<Scalars['ID']['input']>;
};

/** A new categorization rule. */
export type CreateCategoryRuleInput = {
  active?: Scalars['Boolean']['input'];
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  /** Re-categorize existing transactions right away (never manually categorized ones). */
  apply?: Scalars['Boolean']['input'];
  category: Scalars['ID']['input'];
  direction?: RuleDirection;
  field: RuleField;
  match?: RuleMatch;
  pattern: Scalars['String']['input'];
  /** Lower runs first; the first matching rule wins. */
  priority?: Scalars['Int']['input'];
};

/** Preview an uploaded Finanzguru export. */
export type CreateFinanzguruImportInput = {
  /** The uploaded file's store (`finishBigfileUpload`'s id). */
  file: Scalars['ID']['input'];
};

/** A new merchant. Aliases default to the match keys of `fromTransactions` (else the name). */
export type CreateMerchantInput = {
  /** Texts that mean this merchant on a bank line; normalized ("Spar Dankt" → "spar"). */
  aliases?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Default category of its transactions. */
  category?: InputMaybe<Scalars['ID']['input']>;
  /** …or the default category by its base key ("food.groceries"). */
  categoryKey?: InputMaybe<Scalars['String']['input']>;
  description?: Scalars['String']['input'];
  /** Transactions to derive aliases from and attach (e.g. a `merchantCandidates` entry's `transactionIds`). */
  fromTransactions?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The stable key to link by; the normalized name by default. It never changes on rename. */
  key?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  online?: Scalars['Boolean']['input'];
  website?: InputMaybe<Scalars['String']['input']>;
};

/** A new merchant rule: matching transactions get the merchant (before aliases; never over a manual link). */
export type CreateMerchantRuleInput = {
  active?: Scalars['Boolean']['input'];
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  /** Re-match existing transactions right away. */
  apply?: Scalars['Boolean']['input'];
  direction?: RuleDirection;
  field: RuleField;
  /** Pin a place (by id or store number, created if new). */
  location?: InputMaybe<LocationRef>;
  match?: RuleMatch;
  merchant: MerchantRef;
  pattern: Scalars['String']['input'];
  /** Lower runs first; the first matching rule wins. */
  priority?: Scalars['Int']['input'];
};

/** An amount in one currency. */
export type CurrencyTotal = {
  __typename?: 'CurrencyTotal';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
};

/** Totals for one day (only days with activity). */
export type DayTotals = {
  __typename?: 'DayTotals';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
};

/** Money in or money out. */
export enum Direction {
  In = 'IN',
  Out = 'OUT'
}

export type FinishBigFileUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

/** An expected end-of-day balance. */
export type ForecastPoint = {
  __typename?: 'ForecastPoint';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
};

/** A geocoder hit. */
export type GeocodeResult = {
  __typename?: 'GeocodeResult';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  latitude: Scalars['Decimal']['output'];
  longitude: Scalars['Decimal']['output'];
  osmId?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  street?: Maybe<Scalars['String']['output']>;
};

/** The bucket size of a cashflow series. */
export enum Granularity {
  Month = 'MONTH',
  Week = 'WEEK'
}

/** A GeoJSON Feature: one grid cell (its point is the cell's snapped center). */
export type GridCell = {
  __typename?: 'GridCell';
  geometry: PointGeometry;
  id: Scalars['ID']['output'];
  properties: GridCellProperties;
  type: Scalars['String']['output'];
};

/** A GeoJSON FeatureCollection of spending-grid cells — valid GeoJSON as returned, and typed. */
export type GridCellCollection = {
  __typename?: 'GridCellCollection';
  bbox?: Maybe<Array<Scalars['Float']['output']>>;
  cellMeters: Scalars['Float']['output'];
  features: Array<GridCell>;
  type: Scalars['String']['output'];
};

/** What a map styles a spending-grid cell by. */
export type GridCellProperties = {
  __typename?: 'GridCellProperties';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  locations: Scalars['Int']['output'];
  merchants: Scalars['Int']['output'];
};

/** One security position in a depot on a day. One row per day and ISIN is the depot's history. */
export type HoldingSnapshot = {
  __typename?: 'HoldingSnapshot';
  /** The depot. */
  account: BankAccount;
  /** ISO currency of the valuation. */
  currency: Scalars['String']['output'];
  /** The day the position refers to. */
  date: Scalars['Date']['output'];
  /** Average buy-in price per unit (FIFO). */
  fifoPrice?: Maybe<Scalars['Decimal']['output']>;
  id: Scalars['ID']['output'];
  /** The security's ISIN. */
  isin: Scalars['String']['output'];
  /** The security's name. */
  name: Scalars['String']['output'];
  /** The last quoted mid price per unit. */
  price?: Maybe<Scalars['Decimal']['output']>;
  /** Units held (filled). */
  quantity: Scalars['Decimal']['output'];
  /** ETF, STOCK, FUND, CRYPTO, … */
  securityType?: Maybe<Scalars['String']['output']>;
  /** valuation − quantity × fifoPrice: the unrealized gain (negative for a loss). */
  unrealizedGain?: Maybe<Scalars['Decimal']['output']>;
  /** The position's market value. */
  valuation: Scalars['Decimal']['output'];
};

/** Where one account of the file goes, overriding the preview's choice. */
export type ImportAccountChoice = {
  /** Land its rows in this account; null creates a new account. */
  account?: InputMaybe<Scalars['ID']['input']>;
  /** The account as the file names it (the preview's `accounts.reference`). */
  reference: Scalars['String']['input'];
  /** Leave this account out of the import. */
  skip?: Scalars['Boolean']['input'];
};

/** One account of the imported file (a Finanzguru `Referenzkonto`) and where its rows go. */
export type ImportAccountPlan = {
  __typename?: 'ImportAccountPlan';
  /** The account the rows go to; null for a new account (or when ambiguous or skipped). */
  account?: Maybe<BankAccount>;
  /** Rows an earlier import brought in already (they are refreshed, not duplicated). */
  alreadyImported: Scalars['Int']['output'];
  /** AMBIGUOUS only: the accounts that have its IBAN. */
  candidates: Array<BankAccount>;
  currency: Scalars['String']['output'];
  firstDate: Scalars['Date']['output'];
  how: ImportTargetKind;
  /** Its IBAN, if the reference is one. */
  iban?: Maybe<Scalars['String']['output']>;
  lastDate: Scalars['Date']['output'];
  /** Rows that are the same booking as a synced row: that row gets the import's category and note instead of a duplicate. */
  matched: Scalars['Int']['output'];
  /** The file's name for it (`Name Referenzkonto`). */
  name?: Maybe<Scalars['String']['output']>;
  /** Rows that become new transactions. */
  new: Scalars['Int']['output'];
  /** The account as the file names it (an IBAN, or e.g. a card or PayPal account). */
  reference: Scalars['String']['output'];
  rows: Scalars['Int']['output'];
};

/** Which category an imported app's (main, sub) category means. Proposed on first sight, editable; every import uses it. */
export type ImportCategoryMapping = {
  __typename?: 'ImportCategoryMapping';
  /** The category rows with this pair get; null leaves them to rules and suggestions. */
  category?: Maybe<Category>;
  /** When the pair was first seen. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The app's main category (Finanzguru: Analyse-Hauptkategorie). */
  main: Scalars['String']['output'];
  /** Still the automatic proposal (false once a user set it). */
  proposed: Scalars['Boolean']['output'];
  /** The app whose categories this maps. */
  source: ImportSource;
  /** The app's subcategory (Finanzguru: Analyse-Unterkategorie); empty if none. */
  sub: Scalars['String']['output'];
};

/** Which category an imported (main, sub) category means. */
export type ImportCategoryMappingInput = {
  /** The category; null leaves such rows to rules and suggestions. */
  category?: InputMaybe<Scalars['ID']['input']>;
  main: Scalars['String']['input'];
  sub?: Scalars['String']['input'];
};

/** Which app or format a statement import came from. */
export enum ImportSource {
  Finanzguru = 'FINANZGURU'
}

/** Where a statement import is: PREVIEWED (nothing written yet), APPLIED, or FAILED (the file could not be read; see `error`). */
export enum ImportStatus {
  Applied = 'APPLIED',
  Failed = 'FAILED',
  Previewed = 'PREVIEWED'
}

/** How a source account's target was decided: IBAN (the organization's one account with its IBAN), IMPORTED (created by an earlier import), NEW (a new account will be created), AMBIGUOUS (several accounts have the IBAN — choose one when applying), CHOSEN (the caller chose it), SKIPPED. */
export enum ImportTargetKind {
  Ambiguous = 'AMBIGUOUS',
  Chosen = 'CHOSEN',
  Iban = 'IBAN',
  Imported = 'IMPORTED',
  New = 'NEW',
  Skipped = 'SKIPPED'
}

/** A bank Enable Banking can reach. */
export type Institution = {
  __typename?: 'Institution';
  bic?: Maybe<Scalars['String']['output']>;
  country: Scalars['String']['output'];
  logo?: Maybe<Scalars['String']['output']>;
  /** The longest consent this bank grants, in days. */
  maximumConsentDays?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
};

/** Investment income or cost in one year. */
export type InvestmentIncome = {
  __typename?: 'InvestmentIncome';
  /** Signed: payouts positive, fees and taxes negative. */
  amount: Scalars['Decimal']['output'];
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  kind: TransactionKind;
  year: Scalars['Int']['output'];
};

/** Where a Scalable link is: waiting for the login code to be approved, then for the second factor. */
export enum LinkStep {
  Device = 'DEVICE',
  Done = 'DONE',
  Mfa = 'MFA'
}

/** Everything about one merchant place over a window. */
export type LocationInsights = {
  __typename?: 'LocationInsights';
  location: MerchantLocation;
  monthly: Array<CashflowBucket>;
  tickets: Array<TicketStats>;
  totals: Array<MoneyTotals>;
  visits: VisitStats;
  weekdays: Array<WeekdayTotals>;
  window: WindowInfo;
};

/** A place of the merchant, by `id` or by `storeCode` (the store number bank lines carry) — give exactly one. */
export type LocationRef = {
  id?: InputMaybe<Scalars['ID']['input']>;
  storeCode?: InputMaybe<Scalars['String']['input']>;
};

/** Where a merchant location came from: a store number on a bank line (DISCOVERED, no address yet), a user (MANUAL) or the geocoder (GEOCODED). */
export enum LocationSource {
  Discovered = 'DISCOVERED',
  Geocoded = 'GEOCODED',
  Manual = 'MANUAL'
}

/** Set whether a transaction moves money between own accounts. */
export type MarkTransferInput = {
  id: Scalars['ID']['input'];
  /** True or false pins it; null returns it to automatic detection (by counterparty IBAN). */
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type Merchant = {
  __typename?: 'Merchant';
  /** The merchant it means. */
  aliases: Array<MerchantAlias>;
  /** The default category of its transactions (source MERCHANT). */
  category?: Maybe<Category>;
  /** When the merchant was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Notes about the merchant. */
  description: Scalars['String']['output'];
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** Meters from the point of a `near` filter to its closest located store; null without one. */
  distanceMeters?: Maybe<Scalars['Float']['output']>;
  /** The day of its first transaction. */
  firstSeen?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  /** The normalized name; unique per organization. */
  key: Scalars['String']['output'];
  /** The day of its latest transaction. */
  lastSeen?: Maybe<Scalars['Date']['output']>;
  /** Its places. */
  locations: Array<MerchantLocation>;
  /** An image URL for the merchant's logo. */
  logoUrl?: Maybe<Scalars['String']['output']>;
  /** The merchant's display name. */
  name: Scalars['String']['output'];
  /** The net amount per currency over its booked transactions (negative: money spent there). */
  net: Array<CurrencyTotal>;
  /** Online only: no physical stores. */
  online: Scalars['Boolean']['output'];
  /** Rules mapping transactions to it. */
  rules: Array<MerchantRule>;
  /** The organization's merchants closest in meaning to this one (by name and description). */
  similarMerchants: Array<Merchant>;
  /** How many transactions it has. */
  transactionCount: Scalars['Int']['output'];
  /** Its transactions. */
  transactions: Array<Transaction>;
  /** The merchant's website. */
  website?: Maybe<Scalars['String']['output']>;
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantLocationsArgs = {
  filters?: InputMaybe<MerchantLocationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantRulesArgs = {
  filters?: InputMaybe<MerchantRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantSimilarMerchantsArgs = {
  limit?: Scalars['Int']['input'];
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A normalized counterparty prefix that means this merchant ("spar" matches "Spar Dankt 3418"). */
export type MerchantAlias = {
  __typename?: 'MerchantAlias';
  /** When the alias was added. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The merchant it means. */
  merchant: Merchant;
  /** Normalized words (lower-case, no numbers or boilerplate) a line's key must start with. */
  pattern: Scalars['String']['output'];
};

/** A counterparty that recurs without a merchant: a merchant waiting to be created (`createMerchant(input: {fromTransactions: …})`). */
export type MerchantCandidate = {
  __typename?: 'MerchantCandidate';
  count: Scalars['Int']['output'];
  /** The normalized text its lines share (becomes the alias). */
  key: Scalars['String']['output'];
  /** Up to three counterparty spellings. */
  samples: Array<Scalars['String']['output']>;
  /** How many distinct store numbers its lines carry (each becomes a location). */
  storeCodes: Scalars['Int']['output'];
  /** What its latest transaction would most likely be categorized as. */
  suggestedCategory?: Maybe<Category>;
  /** Net amount per currency. */
  totals: Array<CurrencyTotal>;
  transactionIds: Array<Scalars['ID']['output']>;
};

/**
 * Someone the organization pays or is paid by — "Spar", "Wiener Linien", the landlord.
 *
 * Recognized on bank lines by its :class:`MerchantAlias` rows (see :mod:`finance.merchants`).
 * A merchant may carry a default ``category`` for its transactions (source MERCHANT: after
 * rules, before semantic guesses). Name + description are embedded for semantic ``search``.
 */
export type MerchantFilter = {
  AND?: InputMaybe<MerchantFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MerchantFilter>;
  OR?: InputMaybe<MerchantFilter>;
  category?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only merchants with a located store within `radiusMeters` of a point, nearest first (`distanceMeters` on each). */
  near?: InputMaybe<NearInput>;
  online?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by text: a substring of name, description or an alias, or semantic similarity to name and description. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Everything about one merchant over a window. */
export type MerchantInsights = {
  __typename?: 'MerchantInsights';
  changes: Array<Change>;
  locations: Array<RankedLocation>;
  merchant: Merchant;
  monthly: Array<CashflowBucket>;
  previous: Array<MoneyTotals>;
  /** Its part of the expense in its default category (and children). */
  shareOfCategory: Array<Share>;
  tickets: Array<TicketStats>;
  totals: Array<MoneyTotals>;
  visits: VisitStats;
  weekdays: Array<WeekdayTotals>;
  window: WindowInfo;
};

/** A place of a merchant — a store, a branch. `latitude`/`longitude` are null until known (a store discovered from a bank line starts without an address). */
export type MerchantLocation = {
  __typename?: 'MerchantLocation';
  /** City. */
  city?: Maybe<Scalars['String']['output']>;
  /** ISO 3166-1 alpha-2 country code. */
  country?: Maybe<Scalars['String']['output']>;
  /** When the location was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Meters from the point of a `near` filter; null without one. */
  distanceMeters?: Maybe<Scalars['Float']['output']>;
  /** When it was last geocoded. */
  geocodedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** The day of the latest transaction here. */
  lastVisit?: Maybe<Scalars['Date']['output']>;
  /** WGS84 latitude. */
  latitude?: Maybe<Scalars['Decimal']['output']>;
  /** WGS84 longitude. */
  longitude?: Maybe<Scalars['Decimal']['output']>;
  /** The merchant. */
  merchant: Merchant;
  /** A display name (e.g. 'Spar 3418', 'Spar Mariahilfer Straße'). */
  name: Scalars['String']['output'];
  /** Notes. */
  notes: Scalars['String']['output'];
  /** The OpenStreetMap object it was geocoded to (N123, W456). */
  osmId?: Maybe<Scalars['String']['output']>;
  /** Postal code. */
  postalCode?: Maybe<Scalars['String']['output']>;
  /** State or region. */
  region?: Maybe<Scalars['String']['output']>;
  /** Where the location came from. */
  source: LocationSource;
  /** The store number bank lines carry for this place; unique per merchant. */
  storeCode?: Maybe<Scalars['String']['output']>;
  /** Street and number. */
  street?: Maybe<Scalars['String']['output']>;
  /** How many transactions happened here. */
  transactionCount: Scalars['Int']['output'];
  /** Transactions at this place. */
  transactions: Array<Transaction>;
};


/** A place of a merchant — a store, a branch. `latitude`/`longitude` are null until known (a store discovered from a bank line starts without an address). */
export type MerchantLocationTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A GeoJSON Feature: one located merchant place. */
export type MerchantLocationFeature = {
  __typename?: 'MerchantLocationFeature';
  geometry: PointGeometry;
  id: Scalars['ID']['output'];
  properties: MerchantLocationProperties;
  /** Always `Feature`. */
  type: Scalars['String']['output'];
};

/** A GeoJSON FeatureCollection of merchant places — valid GeoJSON as returned, and fully typed. */
export type MerchantLocationFeatureCollection = {
  __typename?: 'MerchantLocationFeatureCollection';
  /** `[west, south, east, north]` around the features; null when empty. */
  bbox?: Maybe<Array<Scalars['Float']['output']>>;
  features: Array<MerchantLocationFeature>;
  /** Always `FeatureCollection`. */
  type: Scalars['String']['output'];
};

/**
 * A place of a merchant: a store, a branch, a station.
 *
 * ``latitude``/``longitude`` are what the API reads and writes; ``point`` is the PostGIS
 * geography Postgres generates from them (GiST-indexed) for ``near`` queries — see
 * :mod:`finance.geo`. A location discovered from a store number has no address until a user
 * fills it in or geocodes it.
 */
export type MerchantLocationFilter = {
  AND?: InputMaybe<MerchantLocationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MerchantLocationFilter>;
  OR?: InputMaybe<MerchantLocationFilter>;
  category?: InputMaybe<Scalars['ID']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  merchant?: InputMaybe<Scalars['ID']['input']>;
  /** Only locations within `radiusMeters` of a point, nearest first (`distanceMeters` on each). */
  near?: InputMaybe<NearInput>;
  unlocated?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only located places inside a map viewport. */
  within?: InputMaybe<BoundsInput>;
};

/** A new place of a merchant. */
export type MerchantLocationInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Decimal']['input']>;
  longitude?: InputMaybe<Scalars['Decimal']['input']>;
  merchant: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  notes?: Scalars['String']['input'];
  postalCode?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
  /** The store number bank lines carry for this place. */
  storeCode?: InputMaybe<Scalars['String']['input']>;
  street?: InputMaybe<Scalars['String']['input']>;
};

/** What a map styles a merchant place by: flat, numeric where it matters. */
export type MerchantLocationProperties = {
  __typename?: 'MerchantLocationProperties';
  categoryId?: Maybe<Scalars['ID']['output']>;
  categoryKind?: Maybe<CategoryKind>;
  categoryName?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  /** The merchant's category color, if any. */
  color?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  currency: Scalars['String']['output'];
  /** Meters from the point of a `near` filter. */
  distanceMeters?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  lastVisit?: Maybe<Scalars['Date']['output']>;
  merchantId: Scalars['ID']['output'];
  merchantName: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Net booked amount at this place (negative: money spent), in `currency`. A Decimal string like every amount. */
  net: Scalars['Decimal']['output'];
  postalCode?: Maybe<Scalars['String']['output']>;
  source: LocationSource;
  storeCode?: Maybe<Scalars['String']['output']>;
  street?: Maybe<Scalars['String']['output']>;
  transactionCount: Scalars['Int']['output'];
};

/** A merchant that moved most against the comparison window. */
export type MerchantMove = {
  __typename?: 'MerchantMove';
  change: Change;
  merchant?: Maybe<Merchant>;
};

export type MerchantOrder =
  { createdAt: Ordering; name?: never; }
  |  { createdAt?: never; name: Ordering; };

/** A merchant, by `id` or by `key` (its stable normalized name, e.g. "spar") — give exactly one. */
export type MerchantRef = {
  id?: InputMaybe<Scalars['ID']['input']>;
  /** The merchant's key; normalized like an alias ("Spar" → "spar"). */
  key?: InputMaybe<Scalars['String']['input']>;
};

/** Maps matching transactions to a merchant (like a category rule): the first active rule by priority wins, before aliases; a manual link wins over both. */
export type MerchantRule = {
  __typename?: 'MerchantRule';
  /** Inactive rules are skipped. */
  active: Scalars['Boolean']['output'];
  /** Only match when the absolute amount is at most this. */
  amountMax?: Maybe<Scalars['Decimal']['output']>;
  /** Only match when the absolute amount is at least this. */
  amountMin?: Maybe<Scalars['Decimal']['output']>;
  /** When the rule was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Only match money in, money out, or both. */
  direction: RuleDirection;
  /** The transaction field the pattern is matched against. */
  field: RuleField;
  id: Scalars['ID']['output'];
  /** The pinned place, if any (else a store number on the line decides). */
  location?: Maybe<MerchantLocation>;
  /** How the pattern is compared (case-insensitive). */
  match: RuleMatch;
  /** The merchant matching transactions get. */
  merchant: Merchant;
  /** The text or regular expression to match. */
  pattern: Scalars['String']['output'];
  /** Lower runs first; the first matching rule wins. */
  priority: Scalars['Int']['output'];
  /** How many transactions this rule currently links. */
  transactionCount: Scalars['Int']['output'];
};

/**
 * Maps matching transactions to a merchant — the explicit counterpart of aliases.
 *
 * Same matching as :class:`CategoryRule` (field, match, pattern, direction, amount range;
 * :func:`finance.rules.matches`): e.g. the landlord's IBAN, or a remittance line that names a
 * shop. The first active rule by priority wins, and rules win over aliases; a user's manual
 * link wins over both. A rule may pin a place (``location``); otherwise a store number on the
 * line picks or discovers one, as with aliases.
 */
export type MerchantRuleFilter = {
  AND?: InputMaybe<MerchantRuleFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MerchantRuleFilter>;
  OR?: InputMaybe<MerchantRuleFilter>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  merchant?: InputMaybe<Scalars['ID']['input']>;
};

/** How a transaction got its merchant: a merchant rule (RULE) or an alias (AUTO) — both re-matched when rules or aliases change — or a user (MANUAL, never re-matched). */
export enum MerchantSource {
  Auto = 'AUTO',
  Manual = 'MANUAL',
  None = 'NONE',
  Rule = 'RULE'
}

/** Money in and out with one merchant, in one currency. `merchant` is null for transactions without one. */
export type MerchantTotal = {
  __typename?: 'MerchantTotal';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money out, as a positive amount. */
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  merchant?: Maybe<Merchant>;
  net: Scalars['Decimal']['output'];
};

/** Money in and out in one currency; `expense` is positive. */
export type MoneyTotals = {
  __typename?: 'MoneyTotals';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Teach a merchant another spelling. */
  addMerchantAlias: MerchantAlias;
  /** Write a previewed import into the accounts (idempotent). */
  applyStatementImport: StatementImport;
  /** Link many transactions to a merchant (by id or key) and place (by id or store number), by hand; null hands them back to matching. */
  assignMerchant: Array<Transaction>;
  /** Delete a pending link you started. */
  cancelLink: Scalars['ID']['output'];
  /** Set or clear a transaction's category. */
  categorizeTransaction: Transaction;
  /** Set or clear the category of many transactions at once. */
  categorizeTransactions: Array<Transaction>;
  /** Finish linking a bank with the redirect's code and state. */
  completeBankLink: BankConnection;
  /** Advance a Scalable Capital link; call until the connection is ACTIVE. */
  completeScalableLink: BankConnection;
  /** Create a monthly budget. */
  createBudget: Budget;
  /** Create a category. */
  createCategory: Category;
  /** Create a categorization rule. */
  createCategoryRule: CategoryRule;
  /** Preview an uploaded Finanzguru export (nothing is written into the accounts yet). */
  createFinanzguruImport: StatementImport;
  /** Create a merchant (aliases from `fromTransactions` by default) and match it everywhere. */
  createMerchant: Merchant;
  /** Add a place to a merchant. */
  createMerchantLocation: MerchantLocation;
  /** Create a rule mapping matching transactions to a merchant. */
  createMerchantRule: MerchantRule;
  /** Delete a budget. */
  deleteBudget: Scalars['ID']['output'];
  /** Delete a category (reassigning its transactions, or handing them back to rules and suggestions); `dryRun` reports what would happen. */
  deleteCategory: CategoryDeletion;
  /** Delete a categorization rule. */
  deleteCategoryRule: Scalars['ID']['output'];
  /** Delete a merchant; its transactions are categorized again. */
  deleteMerchant: Scalars['ID']['output'];
  /** Delete a merchant place. */
  deleteMerchantLocation: Scalars['ID']['output'];
  /** Delete a merchant rule. */
  deleteMerchantRule: Scalars['ID']['output'];
  /** Detect recurring payments. */
  detectRecurring: Array<RecurringPayment>;
  /** Finalize a file upload after the client has written the object. */
  finishBigfileUpload: BigFileStore;
  /** Look a place up (OpenStreetMap) and fill in its address and coordinates. */
  geocodeMerchantLocation: MerchantLocation;
  /** Pin or un-pin a transaction as a transfer between own accounts. */
  markTransfer: Transaction;
  /** Pin or un-pin many transactions as transfers at once. */
  markTransfers: Array<Transaction>;
  /** Fold one merchant into another. */
  mergeMerchants: Merchant;
  /** Choose the symbol an ISIN is priced by, for one source. */
  pinSecurityListing: SecurityListing;
  /** Run the rules over existing transactions. */
  reapplyRules: Scalars['Int']['output'];
  /** Fetch and store daily closes from the enabled sources. */
  refreshSecurityPrices: Array<PriceRefresh>;
  /** Forget a merchant spelling. */
  removeMerchantAlias: Scalars['ID']['output'];
  /** Request temporary S3 read credentials for an uploaded file. */
  requestBigfileAccess: BigFileAccessGrant;
  /** Request temporary S3 credentials to upload one file (e.g. a statement export to import). */
  requestBigfileUpload: BigFileUploadGrant;
  /** Find listings for ISINs (OpenFIGI + preferred exchanges). */
  resolveSecurityListings: Array<SecurityListing>;
  /** Bring back a deleted base category. */
  restoreBaseCategory: Array<Category>;
  /** Get the auth session of a pending link you started again (to continue a login). */
  resumeLink: AuthSession;
  /** Withdraw a bank consent; data is kept. */
  revokeBankConnection: BankConnection;
  /** Add the base categories this organization lacks; returns all categories. */
  seedDefaultCategories: Array<Category>;
  /** Set which category imported category pairs mean. */
  setImportCategoryMappings: Array<ImportCategoryMapping>;
  /** Confirm or ignore a recurring payment. */
  setRecurringStatus: RecurringPayment;
  /** Confirm or ignore many recurring payments at once. */
  setRecurringStatuses: Array<RecurringPayment>;
  /** Set or clear a transaction's note. */
  setTransactionNote: Transaction;
  /** Start linking a bank; returns the auth session (finish: REDIRECT). */
  startBankLink: AuthSession;
  /** Start linking Scalable Capital; returns the auth session (finish: POLL). */
  startScalableLink: AuthSession;
  /** Pull an account from the bank now. */
  syncAccount: SyncResult;
  /** Add base categories this organization does not have yet; returns the created ones. */
  syncBaseCategories: Array<Category>;
  /** Pull every account of a connection now. */
  syncConnection: Array<SyncResult>;
  /** Change a budget. */
  updateBudget: Budget;
  /** Change a category. */
  updateCategory: Category;
  /** Change a categorization rule. */
  updateCategoryRule: CategoryRule;
  /** Change a merchant; a new default category re-categorizes its transactions. */
  updateMerchant: Merchant;
  /** Correct a merchant place. */
  updateMerchantLocation: MerchantLocation;
  /** Change a merchant rule. */
  updateMerchantRule: MerchantRule;
  /** Create a merchant, or update the one with this key (aliases are added). */
  upsertMerchant: Merchant;
};


export type MutationAddMerchantAliasArgs = {
  merchant: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationApplyStatementImportArgs = {
  input: ApplyStatementImportInput;
};


export type MutationAssignMerchantArgs = {
  input: AssignMerchantInput;
};


export type MutationCancelLinkArgs = {
  connection: Scalars['ID']['input'];
};


export type MutationCategorizeTransactionArgs = {
  input: CategorizeTransactionInput;
};


export type MutationCategorizeTransactionsArgs = {
  category?: InputMaybe<Scalars['ID']['input']>;
  ids: Array<Scalars['ID']['input']>;
};


export type MutationCompleteBankLinkArgs = {
  input: CompleteBankLinkInput;
};


export type MutationCompleteScalableLinkArgs = {
  state: Scalars['String']['input'];
};


export type MutationCreateBudgetArgs = {
  input: CreateBudgetInput;
};


export type MutationCreateCategoryArgs = {
  input: CreateCategoryInput;
};


export type MutationCreateCategoryRuleArgs = {
  input: CreateCategoryRuleInput;
};


export type MutationCreateFinanzguruImportArgs = {
  input: CreateFinanzguruImportInput;
};


export type MutationCreateMerchantArgs = {
  input: CreateMerchantInput;
};


export type MutationCreateMerchantLocationArgs = {
  input: MerchantLocationInput;
};


export type MutationCreateMerchantRuleArgs = {
  input: CreateMerchantRuleInput;
};


export type MutationDeleteBudgetArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCategoryArgs = {
  dryRun?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  reassignTo?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationDeleteCategoryRuleArgs = {
  apply?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDeleteMerchantArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMerchantLocationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMerchantRuleArgs = {
  apply?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDetectRecurringArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type MutationFinishBigfileUploadArgs = {
  input: FinishBigFileUploadInput;
};


export type MutationGeocodeMerchantLocationArgs = {
  id: Scalars['ID']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkTransferArgs = {
  input: MarkTransferInput;
};


export type MutationMarkTransfersArgs = {
  ids: Array<Scalars['ID']['input']>;
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationMergeMerchantsArgs = {
  into: Scalars['ID']['input'];
  merchant: Scalars['ID']['input'];
};


export type MutationPinSecurityListingArgs = {
  input: PinSecurityListingInput;
};


export type MutationReapplyRulesArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  semanticAssign?: Scalars['Boolean']['input'];
};


export type MutationRefreshSecurityPricesArgs = {
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  isins?: InputMaybe<Array<Scalars['String']['input']>>;
  sources?: InputMaybe<Array<PriceSource>>;
};


export type MutationRemoveMerchantAliasArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRequestBigfileAccessArgs = {
  input: RequestBigFileAccessInput;
};


export type MutationRequestBigfileUploadArgs = {
  input: RequestBigFileUploadInput;
};


export type MutationResolveSecurityListingsArgs = {
  isins?: InputMaybe<Array<Scalars['String']['input']>>;
  sources?: InputMaybe<Array<PriceSource>>;
};


export type MutationRestoreBaseCategoryArgs = {
  key: Scalars['String']['input'];
};


export type MutationResumeLinkArgs = {
  connection: Scalars['ID']['input'];
};


export type MutationRevokeBankConnectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetImportCategoryMappingsArgs = {
  input: Array<ImportCategoryMappingInput>;
};


export type MutationSetRecurringStatusArgs = {
  input: SetRecurringStatusInput;
};


export type MutationSetRecurringStatusesArgs = {
  ids: Array<Scalars['ID']['input']>;
  status: RecurringStatus;
};


export type MutationSetTransactionNoteArgs = {
  input: SetTransactionNoteInput;
};


export type MutationStartBankLinkArgs = {
  input: StartBankLinkInput;
};


export type MutationSyncAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSyncConnectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateBudgetArgs = {
  input: UpdateBudgetInput;
};


export type MutationUpdateCategoryArgs = {
  input: UpdateCategoryInput;
};


export type MutationUpdateCategoryRuleArgs = {
  input: UpdateCategoryRuleInput;
};


export type MutationUpdateMerchantArgs = {
  input: UpdateMerchantInput;
};


export type MutationUpdateMerchantLocationArgs = {
  input: UpdateMerchantLocationInput;
};


export type MutationUpdateMerchantRuleArgs = {
  input: UpdateMerchantRuleInput;
};


export type MutationUpsertMerchantArgs = {
  input: UpsertMerchantInput;
};

/** A circle on the map: WGS84 latitude/longitude and a radius in meters. */
export type NearInput = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  /** Radius in meters (default 1 km). */
  radiusMeters?: Scalars['Float']['input'];
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export enum Ordering {
  Asc = 'ASC',
  AscNullsFirst = 'ASC_NULLS_FIRST',
  AscNullsLast = 'ASC_NULLS_LAST',
  Desc = 'DESC',
  DescNullsFirst = 'DESC_NULLS_FIRST',
  DescNullsLast = 'DESC_NULLS_LAST'
}

/** An organization (tenant). Every bank object belongs to exactly one, and queries only see the current one's data. */
export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
};

/** A dashboard for a window, compared with the previous period or the same period last year. */
export type PeriodOverview = {
  __typename?: 'PeriodOverview';
  categoryMovers: Array<CategoryMove>;
  changes: Array<Change>;
  daily: Array<DayTotals>;
  largestTransactions: Array<Transaction>;
  merchantMovers: Array<MerchantMove>;
  /** Merchants whose first transaction falls in the window. */
  newMerchants: Array<Merchant>;
  previous: Array<MoneyTotals>;
  /** Confirmed recurring payments expected within the window. */
  recurringDue: Array<RecurringPayment>;
  /** (income − expense) / income per currency; can be negative. */
  savingsRate: Array<Share>;
  totals: Array<MoneyTotals>;
  weekdays: Array<WeekdayTotals>;
  window: WindowInfo;
};

/** Choose the listing an ISIN is priced by for one source (it is never re-resolved). */
export type PinSecurityListingInput = {
  exchange?: InputMaybe<Scalars['String']['input']>;
  isin: Scalars['String']['input'];
  source: PriceSource;
  /** The source's symbol: Yahoo VWCE.DE, Twelve Data VWCE (with `exchange` XETR), Scalable the ISIN. */
  symbol: Scalars['String']['input'];
};

/** A GeoJSON Point: `coordinates` is `[longitude, latitude]` (WGS84), as GeoJSON orders them. */
export type PointGeometry = {
  __typename?: 'PointGeometry';
  /** `[longitude, latitude]`. */
  coordinates: Array<Scalars['Float']['output']>;
  /** Always `Point`. */
  type: Scalars['String']['output'];
};

/** The depot: value over time, allocation, positions and investment income. */
export type PortfolioInsights = {
  __typename?: 'PortfolioInsights';
  allocation: Array<Allocation>;
  /** Σ quantity × FIFO price of the current positions. */
  costBasis: Array<CurrencyTotal>;
  income: Array<InvestmentIncome>;
  positions: Array<HoldingSnapshot>;
  unrealizedGain: Array<CurrencyTotal>;
  valuation: Array<CurrencyTotal>;
  valuationHistory: Array<ValuationPoint>;
};

/** How one depot position's price moved over a window. */
export type PositionPerformance = {
  __typename?: 'PositionPerformance';
  /** last − first close, per unit. */
  change?: Maybe<Scalars['Decimal']['output']>;
  /** change / first close. */
  changeRatio?: Maybe<Scalars['Float']['output']>;
  currency?: Maybe<Scalars['String']['output']>;
  firstClose?: Maybe<Scalars['Decimal']['output']>;
  firstDate?: Maybe<Scalars['Date']['output']>;
  isin: Scalars['String']['output'];
  lastClose?: Maybe<Scalars['Decimal']['output']>;
  lastDate?: Maybe<Scalars['Date']['output']>;
  name: Scalars['String']['output'];
  quantity: Scalars['Decimal']['output'];
  source?: Maybe<PriceSource>;
  /** quantity × change: what the position gained or lost in the window at today's quantity. */
  valueChange?: Maybe<Scalars['Decimal']['output']>;
};

/** A recurring payment whose amount changed. */
export type PriceChange = {
  __typename?: 'PriceChange';
  currency: Scalars['String']['output'];
  current: Scalars['Decimal']['output'];
  delta: Scalars['Decimal']['output'];
  previous: Scalars['Decimal']['output'];
  recurring: RecurringPayment;
};

/** A closing price on a trading day. */
export type PricePoint = {
  __typename?: 'PricePoint';
  close: Scalars['Decimal']['output'];
  date: Scalars['Date']['output'];
};

/** What refreshing one ISIN from one source did. */
export type PriceRefresh = {
  __typename?: 'PriceRefresh';
  error?: Maybe<Scalars['String']['output']>;
  isin: Scalars['String']['output'];
  points: Scalars['Int']['output'];
  source: PriceSource;
  symbol?: Maybe<Scalars['String']['output']>;
};

/** An ISIN's daily closes from one source (the first, in preference order, that has any in the window). */
export type PriceSeries = {
  __typename?: 'PriceSeries';
  currency?: Maybe<Scalars['String']['output']>;
  isin: Scalars['String']['output'];
  points: Array<PricePoint>;
  source?: Maybe<PriceSource>;
  symbol?: Maybe<Scalars['String']['output']>;
};

/** Where security prices come from: SCALABLE (the organization's Scalable login), TWELVEDATA (API key), YAHOO (unofficial, no key). */
export enum PriceSource {
  Scalable = 'SCALABLE',
  Twelvedata = 'TWELVEDATA',
  Yahoo = 'YAHOO'
}

/** Who a connection reaches its accounts through. */
export enum Provider {
  Enablebanking = 'ENABLEBANKING',
  Scalable = 'SCALABLE'
}

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Stats for one account. */
  accountInsights: AccountInsights;
  /** Stats for located places inside a circle or viewport. */
  areaInsights: AreaInsights;
  /** An account's end-of-day balance over a range. */
  balanceHistory: Array<BalancePoint>;
  /** A bank account by id. */
  bankAccount: BankAccount;
  /** The organization's bank accounts. */
  bankAccounts: Array<BankAccount>;
  /** A bank connection by id. */
  bankConnection: BankConnection;
  /** The organization's bank connections. */
  bankConnections: Array<BankConnection>;
  /** The banks that can be linked in a country. */
  bankInstitutions: Array<Institution>;
  /** A budget by id. */
  budget: Budget;
  /** Budgeted vs. spent for a month. */
  budgetStatus: Array<BudgetStatus>;
  /** The organization's budgets. */
  budgets: Array<Budget>;
  /** Income, expense and net per month or week and currency. */
  cashflow: Array<CashflowBucket>;
  /** The organization's categories. */
  categories: Array<Category>;
  /** A category by id. */
  category: Category;
  /** Stats for one category, children rolled up. */
  categoryInsights: CategoryInsights;
  /** A categorization rule by id. */
  categoryRule: CategoryRule;
  /** The organization's categorization rules. */
  categoryRules: Array<CategoryRule>;
  /** An account's expected balance over the coming days. */
  forecast: Array<ForecastPoint>;
  /** Places matching an address or name (OpenStreetMap). */
  geocodeSearch: Array<GeocodeResult>;
  /** A depot's positions on a day (its latest synced day by default). */
  holdings: Array<HoldingSnapshot>;
  /** Which category each imported category pair means. */
  importCategoryMappings: Array<ImportCategoryMapping>;
  /** Stats for one merchant place. */
  locationInsights: LocationInsights;
  /** A merchant by id. */
  merchant: Merchant;
  /** Recurring counterparties without a merchant. */
  merchantCandidates: Array<MerchantCandidate>;
  /** Stats for one merchant (by id or key). */
  merchantInsights: MerchantInsights;
  /** A merchant location by id. */
  merchantLocation: MerchantLocation;
  /** Merchant locations (paginated, filterable — `near`, `unlocated`). */
  merchantLocations: Array<MerchantLocation>;
  /** Located merchant places as a typed GeoJSON FeatureCollection (valid GeoJSON as returned — hand it to a map renderer); same filters as `merchantLocations`, e.g. `within` a viewport. */
  merchantLocationsGeojson: MerchantLocationFeatureCollection;
  /** The organization's merchant rules. */
  merchantRules: Array<MerchantRule>;
  /** The organization's merchants (paginated, filterable — e.g. `near` a point). */
  merchants: Array<Merchant>;
  /** A dashboard for a window against a comparison window. */
  periodOverview: PeriodOverview;
  /** The depot: value over time, allocation, positions, investment income. */
  portfolioInsights: PortfolioInsights;
  /** How each depot position's price moved over a window. */
  positionPerformance: Array<PositionPerformance>;
  /** Recurring payments: commitment, due, missed, price changes. */
  recurringInsights: RecurringInsights;
  /** A recurring payment by id. */
  recurringPayment: RecurringPayment;
  /** Detected recurring payments. */
  recurringPayments: Array<RecurringPayment>;
  /** Which symbol prices each ISIN, per source. */
  securityListings: Array<SecurityListing>;
  /** An ISIN's stored daily closes. */
  securityPrices: PriceSeries;
  /** The latest price of an ISIN, fetched now. */
  securityQuote: SecurityQuote;
  /** Income, expense and net per category and currency. */
  spendingByCategory: Array<CategoryTotal>;
  /** Income, expense and net per merchant and currency. */
  spendingByMerchant: Array<MerchantTotal>;
  /** Spending in a viewport binned into map cells (typed GeoJSON). */
  spendingGrid: GridCellCollection;
  /** A statement import by id. */
  statementImport: StatementImport;
  /** The organization's statement imports (uploaded exports), newest first. */
  statementImports: Array<StatementImport>;
  /** The categories a transaction most likely belongs to. */
  suggestCategories: Array<CategorySuggestion>;
  /** Where the most money went, or came from. */
  topCounterparties: Array<CounterpartyTotal>;
  /** A transaction by id. */
  transaction: Transaction;
  /** Transactions across the organization's accounts (paginated, filterable, orderable). */
  transactions: Array<Transaction>;
  /** How many transactions match the filters. */
  transactionsCount: Scalars['Int']['output'];
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryAccountInsightsArgs = {
  account: Scalars['ID']['input'];
  limit?: Scalars['Int']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryAreaInsightsArgs = {
  area: AreaInput;
  limit?: Scalars['Int']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryBalanceHistoryArgs = {
  account: Scalars['ID']['input'];
  dateFrom: Scalars['Date']['input'];
  dateTo?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryBankAccountArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBankAccountsArgs = {
  filters?: InputMaybe<BankAccountFilter>;
  ordering?: Array<BankAccountOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBankConnectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBankConnectionsArgs = {
  filters?: InputMaybe<BankConnectionFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBankInstitutionsArgs = {
  country: Scalars['String']['input'];
};


export type QueryBudgetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBudgetStatusArgs = {
  month?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryBudgetsArgs = {
  filters?: InputMaybe<BudgetFilter>;
  ordering?: Array<BudgetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCashflowArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  granularity?: Granularity;
  includeTransfers?: Scalars['Boolean']['input'];
};


export type QueryCategoriesArgs = {
  filters?: InputMaybe<CategoryFilter>;
  ordering?: Array<CategoryOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCategoryInsightsArgs = {
  category: Scalars['ID']['input'];
  compareTo?: Comparison;
  includeChildren?: Scalars['Boolean']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryCategoryRuleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCategoryRulesArgs = {
  filters?: InputMaybe<CategoryRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryForecastArgs = {
  account: Scalars['ID']['input'];
  horizonDays?: Scalars['Int']['input'];
  includeBudgets?: Scalars['Boolean']['input'];
  includeDetected?: Scalars['Boolean']['input'];
};


export type QueryGeocodeSearchArgs = {
  limit?: Scalars['Int']['input'];
  query: Scalars['String']['input'];
};


export type QueryHoldingsArgs = {
  account: Scalars['ID']['input'];
  date?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryImportCategoryMappingsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLocationInsightsArgs = {
  location: Scalars['ID']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryMerchantArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMerchantCandidatesArgs = {
  limit?: Scalars['Int']['input'];
  minCount?: Scalars['Int']['input'];
};


export type QueryMerchantInsightsArgs = {
  compareTo?: Comparison;
  merchant: MerchantRef;
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryMerchantLocationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMerchantLocationsArgs = {
  filters?: InputMaybe<MerchantLocationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMerchantLocationsGeojsonArgs = {
  filters?: InputMaybe<MerchantLocationFilter>;
  limit?: Scalars['Int']['input'];
};


export type QueryMerchantRulesArgs = {
  filters?: InputMaybe<MerchantRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMerchantsArgs = {
  filters?: InputMaybe<MerchantFilter>;
  ordering?: Array<MerchantOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPeriodOverviewArgs = {
  compareTo?: Comparison;
  limit?: Scalars['Int']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryPortfolioInsightsArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryPositionPerformanceArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryRecurringInsightsArgs = {
  includeDetected?: Scalars['Boolean']['input'];
};


export type QueryRecurringPaymentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRecurringPaymentsArgs = {
  filters?: InputMaybe<RecurringPaymentFilter>;
  ordering?: Array<RecurringPaymentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySecurityListingsArgs = {
  isin?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySecurityPricesArgs = {
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  isin: Scalars['String']['input'];
  priceSource?: InputMaybe<PriceSource>;
};


export type QuerySecurityQuoteArgs = {
  isin: Scalars['String']['input'];
  priceSource?: InputMaybe<PriceSource>;
};


export type QuerySpendingByCategoryArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  includeTransfers?: Scalars['Boolean']['input'];
};


export type QuerySpendingByMerchantArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  includeTransfers?: Scalars['Boolean']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySpendingGridArgs = {
  cellMeters?: Scalars['Float']['input'];
  window?: InputMaybe<StatsWindowInput>;
  within: BoundsInput;
};


export type QueryStatementImportArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStatementImportsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySuggestCategoriesArgs = {
  limit?: Scalars['Int']['input'];
  transaction: Scalars['ID']['input'];
};


export type QueryTopCounterpartiesArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  direction?: Direction;
  limit?: Scalars['Int']['input'];
};


export type QueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTransactionsCountArgs = {
  filters?: InputMaybe<TransactionFilter>;
};

/** A category's totals; `share` is its part of all expense in that currency. */
export type RankedCategory = {
  __typename?: 'RankedCategory';
  category?: Maybe<Category>;
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
  share: Scalars['Float']['output'];
};

/** A place's totals; `share` is its part of all expense in that currency. */
export type RankedLocation = {
  __typename?: 'RankedLocation';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  location?: Maybe<MerchantLocation>;
  net: Scalars['Decimal']['output'];
  share: Scalars['Float']['output'];
};

/** A merchant's totals; `share` is its part of all expense in that currency. */
export type RankedMerchant = {
  __typename?: 'RankedMerchant';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  merchant?: Maybe<Merchant>;
  net: Scalars['Decimal']['output'];
  share: Scalars['Float']['output'];
};

/** Recurring payments: what they commit, what is due, what did not come, what got pricier. */
export type RecurringInsights = {
  __typename?: 'RecurringInsights';
  byCategory: Array<CategoryCommitment>;
  /** Expected within the next 30 days. */
  dueSoon: Array<RecurringPayment>;
  /** Expected more than 3 days ago and not seen since. */
  missed: Array<RecurringPayment>;
  /** Normalized to a month (× 30.44 / interval); `count` is the number of payments. */
  monthlyCommitted: Array<MoneyTotals>;
  priceChanges: Array<PriceChange>;
};

/** A payment that repeats at a regular interval, detected from an account's history. */
export type RecurringPayment = {
  __typename?: 'RecurringPayment';
  /** The account it recurs on. */
  account: BankAccount;
  /** The typical (median) signed amount. */
  amount: Scalars['Decimal']['output'];
  /** ISO currency. */
  currency: Scalars['String']['output'];
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  /** Days between occurrences (7, 14, 30, 91 or 365). */
  intervalDays: Scalars['Int']['output'];
  /** A readable name (the counterparty as last seen). */
  label: Scalars['String']['output'];
  /** The date of the latest occurrence. */
  lastSeen: Scalars['Date']['output'];
  /** When the next occurrence is expected. */
  nextExpected: Scalars['Date']['output'];
  /** How many matching transactions were found. */
  occurrences: Scalars['Int']['output'];
  /** Whether a user confirmed or ignored it. */
  status: RecurringStatus;
  /** The transactions that make up the pattern. */
  transactions: Array<Transaction>;
};


/** A payment that repeats at a regular interval, detected from an account's history. */
export type RecurringPaymentTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A payment detected to repeat at a regular interval (rent, salary, a subscription). */
export type RecurringPaymentFilter = {
  AND?: InputMaybe<RecurringPaymentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RecurringPaymentFilter>;
  OR?: InputMaybe<RecurringPaymentFilter>;
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  status?: InputMaybe<RecurringStatus>;
};

export type RecurringPaymentOrder =
  { amount: Ordering; label?: never; lastSeen?: never; nextExpected?: never; }
  |  { amount?: never; label: Ordering; lastSeen?: never; nextExpected?: never; }
  |  { amount?: never; label?: never; lastSeen: Ordering; nextExpected?: never; }
  |  { amount?: never; label?: never; lastSeen?: never; nextExpected: Ordering; };

/** Whether a user confirmed or ignored a detected recurring payment. Only CONFIRMED ones feed forecasts by default. */
export enum RecurringStatus {
  Confirmed = 'CONFIRMED',
  Detected = 'DETECTED',
  Ignored = 'IGNORED'
}

export type RequestBigFileAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestBigFileUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['ByteCount']['input']>;
  host?: InputMaybe<Scalars['String']['input']>;
  originalFileName: Scalars['String']['input'];
  port?: InputMaybe<Scalars['Int']['input']>;
};

/** Which transactions a rule applies to, by sign. */
export enum RuleDirection {
  Any = 'ANY',
  In = 'IN',
  Out = 'OUT'
}

/** The transaction field a rule matches against. */
export enum RuleField {
  Counterparty = 'COUNTERPARTY',
  Iban = 'IBAN',
  Remittance = 'REMITTANCE'
}

/** How a rule's pattern is compared (case-insensitive). */
export enum RuleMatch {
  Contains = 'CONTAINS',
  Equals = 'EQUALS',
  Regex = 'REGEX'
}

/** Which listing (a source's symbol) the organization prices an ISIN by. `pinned` ones were chosen by a user. */
export type SecurityListing = {
  __typename?: 'SecurityListing';
  /** The listing's trading currency, once a price was fetched. */
  currency?: Maybe<Scalars['String']['output']>;
  /** The exchange (Twelve Data: the MIC, e.g. XETR; else the OpenFIGI exchange code). */
  exchange?: Maybe<Scalars['String']['output']>;
  /** When prices were last fetched for it. */
  fetchedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** The security. */
  isin: Scalars['String']['output'];
  /** Why the last fetch failed, if it did. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The security's name as the source knows it. */
  name?: Maybe<Scalars['String']['output']>;
  /** Chosen by a user: automatic resolution never changes it. */
  pinned: Scalars['Boolean']['output'];
  /** When it was last resolved. */
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The price source this listing is for. */
  source: PriceSource;
  /** The source's symbol (Scalable: the ISIN; Yahoo: VWCE.DE; Twelve Data: VWCE). */
  symbol: Scalars['String']['output'];
};

/** The latest price of an ISIN, fetched now. */
export type SecurityQuote = {
  __typename?: 'SecurityQuote';
  ask?: Maybe<Scalars['Decimal']['output']>;
  bid?: Maybe<Scalars['Decimal']['output']>;
  currency: Scalars['String']['output'];
  isin: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  price: Scalars['Decimal']['output'];
  source: PriceSource;
  symbol: Scalars['String']['output'];
  time?: Maybe<Scalars['DateTime']['output']>;
};

/** Confirm or ignore a detected recurring payment. */
export type SetRecurringStatusInput = {
  id: Scalars['ID']['input'];
  status: RecurringStatus;
};

/** Set or clear a transaction's note. */
export type SetTransactionNoteInput = {
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};

/** A share (0–1) in one currency. */
export type Share = {
  __typename?: 'Share';
  currency: Scalars['String']['output'];
  share: Scalars['Float']['output'];
};

/** Start linking a bank. */
export type StartBankLinkInput = {
  /** The bank's name exactly as `bankInstitutions` lists it. */
  aspspName: Scalars['String']['input'];
  /** The bank's ISO country code, e.g. AT. */
  country: Scalars['String']['input'];
  /** One of the server's registered redirect URLs; the first by default. */
  redirectUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Which total a change is about. */
export enum StatMetric {
  Expense = 'EXPENSE',
  Income = 'INCOME',
  Net = 'NET'
}

/** An uploaded statement export: previewed (nothing written), then applied into the accounts. Applying again is idempotent. */
export type StatementImport = {
  __typename?: 'StatementImport';
  /** Each account of the file and where its rows go. */
  accounts: Array<ImportAccountPlan>;
  /** When the import was (last) applied. */
  appliedAt?: Maybe<Scalars['DateTime']['output']>;
  /** When the file was previewed. */
  createdAt: Scalars['DateTime']['output'];
  /** The user who uploaded the file. */
  creator?: Maybe<User>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** FAILED only: why the file could not be read. */
  error?: Maybe<Scalars['String']['output']>;
  /** The file's name as uploaded. */
  fileName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Everything the preview (and the last apply) found, as stored. */
  report: Scalars['JSON']['output'];
  /** Bookings in the file (split parts folded into their booking). */
  rows: Scalars['Int']['output'];
  /** Which app or format the file came from. */
  source: ImportSource;
  /** Previewed, applied, or failed. */
  status: ImportStatus;
  /** How many transactions carry this import (new ones and enriched synced ones). */
  transactionsCount: Scalars['Int']['output'];
  /** Category pairs of the file without a mapped category; `setImportCategoryMappings` maps them. */
  unmappedCategories: Array<UnmappedImportCategory>;
  /** What was odd about the file (skipped lines, split parts that do not add up, unknown columns). */
  warnings: Array<Scalars['String']['output']>;
};

/** Which transactions a view looks at: a booking-date range (the last 12 months by default) and optionally some accounts. */
export type StatsWindowInput = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  /** Inclusive; today by default. */
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  includePending?: Scalars['Boolean']['input'];
  /** Count transfers between own accounts (and investing) as spending/income. */
  includeTransfers?: Scalars['Boolean']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Events whenever one of the organization's accounts finished syncing. */
  accountSyncs: AccountSyncEvent;
};

/** Why a category was suggested. */
export enum SuggestionReason {
  Both = 'BOTH',
  Neighbours = 'NEIGHBOURS',
  Terms = 'TERMS'
}

/** What a sync of one account did. */
export type SyncResult = {
  __typename?: 'SyncResult';
  account: BankAccount;
  balances: Scalars['Int']['output'];
  categorized: Scalars['Int']['output'];
  created: Scalars['Int']['output'];
  /** Depot positions stored. */
  holdings: Scalars['Int']['output'];
  pendingReplaced: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

/** Size of the outgoing payments, in one currency. */
export type TicketStats = {
  __typename?: 'TicketStats';
  average: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  largest: Scalars['Decimal']['output'];
  median: Scalars['Decimal']['output'];
  smallest: Scalars['Decimal']['output'];
};

/** A booked or pending transaction. Amounts are signed: negative is money out. */
export type Transaction = {
  __typename?: 'Transaction';
  /** The account the transaction is on. */
  account: BankAccount;
  /** Signed amount: negative is money out. */
  amount: Scalars['Decimal']['output'];
  /** When the bank booked it. */
  bookingDate?: Maybe<Scalars['Date']['output']>;
  /** The transaction's category. */
  category?: Maybe<Category>;
  /** Who set the category; rules never override a manual one. */
  categorySource: CategorySource;
  /** Who was paid, or who paid. */
  counterparty?: Maybe<Scalars['String']['output']>;
  /** The counterparty's IBAN, if reported. */
  counterpartyIban?: Maybe<Scalars['String']['output']>;
  /** When this service first saw the transaction. */
  createdAt: Scalars['DateTime']['output'];
  /** ISO currency of the amount. */
  currency: Scalars['String']['output'];
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@bank/kind`). The keys are the ones bank declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** The bank's own reference, when it sends one. */
  entryReference?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Money moved between own accounts; excluded from stats. */
  isTransfer: Scalars['Boolean']['output'];
  /** ``is_transfer`` was set by a user and is not recomputed. */
  isTransferManual: Scalars['Boolean']['output'];
  /** The security traded or paying out, if any. */
  isin?: Maybe<Scalars['String']['output']>;
  /** The provider's transaction type (Scalable: BUY, SELL, DEPOSIT, DISTRIBUTION, INTEREST, FEE, TAX, …); null for bank transactions. */
  kind?: Maybe<TransactionKind>;
  /** Who the transaction was with. */
  merchant?: Maybe<Merchant>;
  /** Where: the merchant's store, when the line names one. */
  merchantLocation?: Maybe<MerchantLocation>;
  /** How the merchant was set (AUTO by alias, MANUAL by a user). */
  merchantSource: MerchantSource;
  /** A user's note. */
  note?: Maybe<Scalars['String']['output']>;
  /** Whether the bank fields were synced or imported from a file. */
  origin: TransactionOrigin;
  /** Units of the security, if any. */
  quantity?: Maybe<Scalars['Decimal']['output']>;
  /** The remittance information (purpose line). */
  remittance?: Maybe<Scalars['String']['output']>;
  /** The exact text this transaction is embedded as: its bank line (normalized: no numbers, 'DANKT', cities or legal forms), then what its merchant and place add. Two lines are similar when these texts are. */
  semanticInput?: Maybe<Scalars['String']['output']>;
  /** The organization's transactions most similar to this one (same merchant, same kind of payment), closest first. `maxDistance` (cosine, 0–2) drops the far ones. */
  similarTransactions: Array<Transaction>;
  /** Booked or pending. */
  status: TransactionStatus;
  /** The categories this transaction most likely belongs to, best first — from similar transactions the organization categorized and from category terms. Empty when it has no embedding yet. */
  suggestedCategories: Array<CategorySuggestion>;
  /** The syncer that last wrote the bank fields; null for imported rows. */
  syncer?: Maybe<AccountSyncer>;
  /** When it was made (e.g. the card payment). */
  transactionDate?: Maybe<Scalars['Date']['output']>;
  /** When the row last changed. */
  updatedAt: Scalars['DateTime']['output'];
  /** When it took effect for interest. */
  valueDate?: Maybe<Scalars['Date']['output']>;
};


/** A booked or pending transaction. Amounts are signed: negative is money out. */
export type TransactionSimilarTransactionsArgs = {
  limit?: Scalars['Int']['input'];
  maxDistance?: InputMaybe<Scalars['Float']['input']>;
};


/** A booked or pending transaction. Amounts are signed: negative is money out. */
export type TransactionSuggestedCategoriesArgs = {
  limit?: Scalars['Int']['input'];
};

/**
 * A single booked or pending transaction on an account.
 *
 * Counterparty, remittance and provider kind are embedded: similar transactions (the same
 * merchant, the same kind of payment) sit close together, which drives ``search``,
 * ``similarTransactions`` and category suggestions (:mod:`finance.semantic`).
 *
 * Bank fields are overwritten by every sync; ``category``, ``note`` and ``is_transfer``
 * belong to the users and survive re-syncs of booked rows (see :mod:`finance.sync`).
 *
 * A row is SYNC (a syncer wrote it) or IMPORT (a statement import did). A sync that finds the
 * same booking as an IMPORT row takes that row over instead of adding a second one
 * (:mod:`finance.matching`), keeping its category, note and ``import_raw``.
 */
export type TransactionFilter = {
  AND?: InputMaybe<TransactionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TransactionFilter>;
  OR?: InputMaybe<TransactionFilter>;
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  categories?: InputMaybe<Array<Scalars['ID']['input']>>;
  categorySource?: InputMaybe<CategorySource>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  direction?: InputMaybe<Direction>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  includeChildCategories?: InputMaybe<Scalars['Boolean']['input']>;
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
  kind?: InputMaybe<TransactionKind>;
  kinds?: InputMaybe<Array<TransactionKind>>;
  locations?: InputMaybe<Array<Scalars['ID']['input']>>;
  merchantSource?: InputMaybe<MerchantSource>;
  merchants?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only transactions at a merchant location within `radiusMeters` of a point, nearest first. */
  near?: InputMaybe<NearInput>;
  /** Keep transactions that look like they belong to this category — close to what the organization put there, or to one of its terms — closest first. */
  nearCategory?: InputMaybe<Scalars['ID']['input']>;
  /** Search by text: a case-insensitive substring of counterparty, remittance or note; semantic similarity to them; or a category whose terms mean the text ("supermarket" finds what is in Groceries). Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Order by similarity to the given transaction, nearest first (no cut-off, composes with other filters and pagination). Empty when it is not in this organization or has no embedding yet. */
  similarTo?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<TransactionStatus>;
  uncategorized?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A provider's transaction type (Scalable's broker and savings types). OTHER is a type this service does not know yet. */
export enum TransactionKind {
  Buy = 'BUY',
  CashTransferIn = 'CASH_TRANSFER_IN',
  CashTransferOut = 'CASH_TRANSFER_OUT',
  CorporateAction = 'CORPORATE_ACTION',
  CurrencySwitchBuy = 'CURRENCY_SWITCH_BUY',
  CurrencySwitchSell = 'CURRENCY_SWITCH_SELL',
  Deposit = 'DEPOSIT',
  Distribution = 'DISTRIBUTION',
  Fee = 'FEE',
  Interest = 'INTEREST',
  Other = 'OTHER',
  PocketMoney = 'POCKET_MONEY',
  Reinvestment = 'REINVESTMENT',
  ReinvestmentDistribution = 'REINVESTMENT_DISTRIBUTION',
  ReinvestmentPocketMoney = 'REINVESTMENT_POCKET_MONEY',
  SavingsPlan = 'SAVINGS_PLAN',
  Sell = 'SELL',
  SwapIn = 'SWAP_IN',
  SwapOut = 'SWAP_OUT',
  Tax = 'TAX',
  TaxReturn = 'TAX_RETURN',
  TransferIn = 'TRANSFER_IN',
  TransferOut = 'TRANSFER_OUT',
  Withdrawal = 'WITHDRAWAL'
}

export type TransactionOrder =
  { amount: Ordering; bookingDate?: never; createdAt?: never; }
  |  { amount?: never; bookingDate: Ordering; createdAt?: never; }
  |  { amount?: never; bookingDate?: never; createdAt: Ordering; };

/** Where a transaction's bank fields came from: a syncer (SYNC), or a file import (IMPORT) — a sync that finds the same booking later takes an IMPORT row over, keeping its category and note. */
export enum TransactionOrigin {
  Import = 'IMPORT',
  Sync = 'SYNC'
}

/** Booking status as reported by the bank. */
export enum TransactionStatus {
  Booked = 'BOOKED',
  Other = 'OTHER',
  Pending = 'PENDING'
}

/** An imported category pair no category is mapped to (yet): its rows stay uncategorized, for rules and suggestions. */
export type UnmappedImportCategory = {
  __typename?: 'UnmappedImportCategory';
  main: Scalars['String']['output'];
  rows: Scalars['Int']['output'];
  sub: Scalars['String']['output'];
};

/** Changes to a budget; omitted fields stay as they are. */
export type UpdateBudgetInput = {
  amount?: InputMaybe<Scalars['Decimal']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  endMonth?: InputMaybe<Scalars['Date']['input']>;
  id: Scalars['ID']['input'];
  startMonth?: InputMaybe<Scalars['Date']['input']>;
};

/** Changes to a category; omitted fields stay as they are. */
export type UpdateCategoryInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  hidden?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  /** Only for a top-level category; the whole subtree follows. */
  kind?: InputMaybe<CategoryKind>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new parent, or null to make it top-level. Moving takes the new root's kind. */
  parent?: InputMaybe<Scalars['ID']['input']>;
};

/** Changes to a rule; omitted fields stay as they are. */
export type UpdateCategoryRuleInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  apply?: Scalars['Boolean']['input'];
  category?: InputMaybe<Scalars['ID']['input']>;
  direction?: InputMaybe<RuleDirection>;
  field?: InputMaybe<RuleField>;
  id: Scalars['ID']['input'];
  match?: InputMaybe<RuleMatch>;
  pattern?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
};

/** Changes to a merchant; omitted fields stay as they are. */
export type UpdateMerchantInput = {
  /** The default category, or null for none; its transactions follow. */
  category?: InputMaybe<Scalars['ID']['input']>;
  /** …or the default category by its base key. */
  categoryKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  /** A new key — only when you mean to change what clients link by. */
  key?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  /** A new display name; the `key` stays (links by key keep working). */
  name?: InputMaybe<Scalars['String']['input']>;
  online?: InputMaybe<Scalars['Boolean']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Changes to a place; omitted fields stay as they are. */
export type UpdateMerchantLocationInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  latitude?: InputMaybe<Scalars['Decimal']['input']>;
  longitude?: InputMaybe<Scalars['Decimal']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
  storeCode?: InputMaybe<Scalars['String']['input']>;
  street?: InputMaybe<Scalars['String']['input']>;
};

/** Changes to a merchant rule; omitted fields stay as they are. */
export type UpdateMerchantRuleInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  apply?: Scalars['Boolean']['input'];
  direction?: InputMaybe<RuleDirection>;
  field?: InputMaybe<RuleField>;
  id: Scalars['ID']['input'];
  /** A place to pin, or null to let the store number decide. */
  location?: InputMaybe<LocationRef>;
  match?: InputMaybe<RuleMatch>;
  merchant?: InputMaybe<MerchantRef>;
  pattern?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
};

/** Create a merchant, or update the one with this key. Omitted fields keep their value on update; `aliases` are added (never removed). */
export type UpsertMerchantInput = {
  /** Texts to add as aliases (the key itself is always one). */
  aliases?: InputMaybe<Array<Scalars['String']['input']>>;
  category?: InputMaybe<Scalars['ID']['input']>;
  categoryKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** What the merchant is found by; normalized ("McDonald's" → "mcdonald"). */
  key: Scalars['String']['input'];
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  /** Display name; the key's text when creating without one. */
  name?: InputMaybe<Scalars['String']['input']>;
  online?: InputMaybe<Scalars['Boolean']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** A user account; sub is the stable subject identifier from the identity provider. */
export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

/** The depot on one day: its value, what was put in, and the gain. */
export type ValuationPoint = {
  __typename?: 'ValuationPoint';
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
  gain: Scalars['Decimal']['output'];
  /** Net money put into securities up to this day (buys and savings plans minus sells). */
  invested: Scalars['Decimal']['output'];
  valuation: Scalars['Decimal']['output'];
};

/** When and how often: visits are distinct days with a transaction. */
export type VisitStats = {
  __typename?: 'VisitStats';
  averageDaysBetweenVisits?: Maybe<Scalars['Float']['output']>;
  daysSinceLastVisit?: Maybe<Scalars['Int']['output']>;
  firstVisit?: Maybe<Scalars['Date']['output']>;
  lastVisit?: Maybe<Scalars['Date']['output']>;
  visits: Scalars['Int']['output'];
  /** Visits per 30.44 days of the window. */
  visitsPerMonth?: Maybe<Scalars['Float']['output']>;
};

/** Totals for one ISO weekday (1 = Monday … 7 = Sunday). */
export type WeekdayTotals = {
  __typename?: 'WeekdayTotals';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  weekday: Scalars['Int']['output'];
};

/** The window a view covered, and the one it was compared with. */
export type WindowInfo = {
  __typename?: 'WindowInfo';
  end: Scalars['Date']['output'];
  previousEnd?: Maybe<Scalars['Date']['output']>;
  previousStart?: Maybe<Scalars['Date']['output']>;
  start: Scalars['Date']['output'];
};

export type _Entity = AccountSyncer | BalanceSnapshot | BankAccount | BankConnection | BigFileStore | Budget | Category | CategoryRule | HoldingSnapshot | ImportCategoryMapping | Merchant | MerchantAlias | MerchantLocation | MerchantRule | Organization | RecurringPayment | SecurityListing | StatementImport | Transaction | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type BalanceFragment = { __typename?: 'BalanceSnapshot', id: string, date: string, balanceType: string, amount: string, currency: string };

export type ListBankAccountFragment = { __typename?: 'BankAccount', id: string, iban?: string | null, name?: string | null, kind: AccountKind, currency: string, lastSyncedAt?: string | null, isSyncing: boolean, latestBalance?: { __typename?: 'BalanceSnapshot', id: string, date: string, balanceType: string, amount: string, currency: string } | null, connection?: { __typename?: 'BankConnection', id: string, aspspName: string, needsReauth: boolean } | null };

export type PickerCategoryFragment = { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind, parent?: { __typename?: 'Category', id: string, name: string } | null };

export type PickerMerchantFragment = { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null, category?: { __typename?: 'Category', id: string, name: string } | null };

export type TransactionCategoryFragment = { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind };

export type ListTransactionFragment = { __typename?: 'Transaction', id: string, bookingDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, kind?: TransactionKind | null, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null, category?: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind } | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } };

export type TransactionFragment = { __typename?: 'Transaction', valueDate?: string | null, note?: string | null, categorySource: CategorySource, merchantSource: MerchantSource, counterpartyIban?: string | null, id: string, bookingDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, kind?: TransactionKind | null, merchantLocation?: { __typename?: 'MerchantLocation', id: string, name: string, street?: string | null, city?: string | null } | null, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null, category?: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind } | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } };

export type CategorizeTransactionMutationVariables = Exact<{
  input: CategorizeTransactionInput;
}>;


export type CategorizeTransactionMutation = { __typename?: 'Mutation', categorizeTransaction: { __typename?: 'Transaction', valueDate?: string | null, note?: string | null, categorySource: CategorySource, merchantSource: MerchantSource, counterpartyIban?: string | null, id: string, bookingDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, kind?: TransactionKind | null, merchantLocation?: { __typename?: 'MerchantLocation', id: string, name: string, street?: string | null, city?: string | null } | null, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null, category?: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind } | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } } };

export type AssignMerchantMutationVariables = Exact<{
  input: AssignMerchantInput;
}>;


export type AssignMerchantMutation = { __typename?: 'Mutation', assignMerchant: Array<{ __typename?: 'Transaction', valueDate?: string | null, note?: string | null, categorySource: CategorySource, merchantSource: MerchantSource, counterpartyIban?: string | null, id: string, bookingDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, kind?: TransactionKind | null, merchantLocation?: { __typename?: 'MerchantLocation', id: string, name: string, street?: string | null, city?: string | null } | null, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null, category?: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind } | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } }> };

export type CreateCategoryMutationVariables = Exact<{
  input: CreateCategoryInput;
}>;


export type CreateCategoryMutation = { __typename?: 'Mutation', createCategory: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind, parent?: { __typename?: 'Category', id: string, name: string } | null } };

export type CreateMerchantMutationVariables = Exact<{
  input: CreateMerchantInput;
}>;


export type CreateMerchantMutation = { __typename?: 'Mutation', createMerchant: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null, category?: { __typename?: 'Category', id: string, name: string } | null } };

export type ListBankAccountsQueryVariables = Exact<{
  filters?: InputMaybe<BankAccountFilter>;
  ordering?: Array<BankAccountOrder> | BankAccountOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListBankAccountsQuery = { __typename?: 'Query', bankAccounts: Array<{ __typename?: 'BankAccount', id: string, iban?: string | null, name?: string | null, kind: AccountKind, currency: string, lastSyncedAt?: string | null, isSyncing: boolean, latestBalance?: { __typename?: 'BalanceSnapshot', id: string, date: string, balanceType: string, amount: string, currency: string } | null, connection?: { __typename?: 'BankConnection', id: string, aspspName: string, needsReauth: boolean } | null }> };

export type BankPaletteSearchQueryVariables = Exact<{
  search: Scalars['String']['input'];
  limit: Scalars['Int']['input'];
}>;


export type BankPaletteSearchQuery = { __typename?: 'Query', transactions: Array<{ __typename?: 'Transaction', id: string, counterparty?: string | null, remittance?: string | null, amount: string, currency: string, bookingDate?: string | null }>, bankAccounts: Array<{ __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null, currency: string }>, merchants: Array<{ __typename?: 'Merchant', id: string, name: string, description: string }>, categories: Array<{ __typename?: 'Category', id: string, name: string, description: string }> };

export type CategoryPickerQueryVariables = Exact<{
  transaction: Scalars['ID']['input'];
}>;


export type CategoryPickerQuery = { __typename?: 'Query', categories: Array<{ __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind, parent?: { __typename?: 'Category', id: string, name: string } | null }>, suggestCategories: Array<{ __typename?: 'CategorySuggestion', score: number, category: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind, parent?: { __typename?: 'Category', id: string, name: string } | null } }> };

export type MerchantPickerQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
}>;


export type MerchantPickerQuery = { __typename?: 'Query', merchants: Array<{ __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null, category?: { __typename?: 'Category', id: string, name: string } | null }> };

export type ListTransactionsQueryVariables = Exact<{
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder> | TransactionOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListTransactionsQuery = { __typename?: 'Query', transactions: Array<{ __typename?: 'Transaction', id: string, bookingDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, kind?: TransactionKind | null, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null, category?: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind } | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } }> };

export type GetTransactionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTransactionQuery = { __typename?: 'Query', transaction: { __typename?: 'Transaction', valueDate?: string | null, note?: string | null, categorySource: CategorySource, merchantSource: MerchantSource, counterpartyIban?: string | null, id: string, bookingDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, kind?: TransactionKind | null, merchantLocation?: { __typename?: 'MerchantLocation', id: string, name: string, street?: string | null, city?: string | null } | null, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null, category?: { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind } | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } } };

export type AccountSyncsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AccountSyncsSubscription = { __typename?: 'Subscription', accountSyncs: { __typename?: 'AccountSyncEvent', accountId: string, created: number, updated: number, pendingReplaced: number } };

export const BalanceFragmentDoc = gql`
    fragment Balance on BalanceSnapshot {
  id
  date
  balanceType
  amount
  currency
}
    `;
export const ListBankAccountFragmentDoc = gql`
    fragment ListBankAccount on BankAccount {
  id
  iban
  name
  kind
  currency
  lastSyncedAt
  isSyncing
  latestBalance {
    ...Balance
  }
  connection {
    id
    aspspName
    needsReauth
  }
}
    ${BalanceFragmentDoc}`;
export const TransactionCategoryFragmentDoc = gql`
    fragment TransactionCategory on Category {
  id
  name
  color
  kind
}
    `;
export const PickerCategoryFragmentDoc = gql`
    fragment PickerCategory on Category {
  ...TransactionCategory
  parent {
    id
    name
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const PickerMerchantFragmentDoc = gql`
    fragment PickerMerchant on Merchant {
  id
  name
  logoUrl
  category {
    id
    name
  }
}
    `;
export const ListTransactionFragmentDoc = gql`
    fragment ListTransaction on Transaction {
  id
  bookingDate
  transactionDate
  amount
  currency
  status
  counterparty
  remittance
  isTransfer
  kind
  merchant {
    id
    name
    logoUrl
  }
  category {
    ...TransactionCategory
  }
  account {
    id
    name
    iban
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const TransactionFragmentDoc = gql`
    fragment Transaction on Transaction {
  ...ListTransaction
  valueDate
  note
  categorySource
  merchantSource
  counterpartyIban
  merchantLocation {
    id
    name
    street
    city
  }
}
    ${ListTransactionFragmentDoc}`;
export const CategorizeTransactionDocument = gql`
    mutation CategorizeTransaction($input: CategorizeTransactionInput!) {
  categorizeTransaction(input: $input) {
    ...Transaction
  }
}
    ${TransactionFragmentDoc}`;
export type CategorizeTransactionMutationFn = Apollo.MutationFunction<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>;

/**
 * __useCategorizeTransactionMutation__
 *
 * To run a mutation, you first call `useCategorizeTransactionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCategorizeTransactionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [categorizeTransactionMutation, { data, loading, error }] = useCategorizeTransactionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCategorizeTransactionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>(CategorizeTransactionDocument, options);
      }
export type CategorizeTransactionMutationHookResult = ReturnType<typeof useCategorizeTransactionMutation>;
export type CategorizeTransactionMutationResult = Apollo.MutationResult<CategorizeTransactionMutation>;
export type CategorizeTransactionMutationOptions = Apollo.BaseMutationOptions<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>;
export const AssignMerchantDocument = gql`
    mutation AssignMerchant($input: AssignMerchantInput!) {
  assignMerchant(input: $input) {
    ...Transaction
  }
}
    ${TransactionFragmentDoc}`;
export type AssignMerchantMutationFn = Apollo.MutationFunction<AssignMerchantMutation, AssignMerchantMutationVariables>;

/**
 * __useAssignMerchantMutation__
 *
 * To run a mutation, you first call `useAssignMerchantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssignMerchantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [assignMerchantMutation, { data, loading, error }] = useAssignMerchantMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAssignMerchantMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AssignMerchantMutation, AssignMerchantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AssignMerchantMutation, AssignMerchantMutationVariables>(AssignMerchantDocument, options);
      }
export type AssignMerchantMutationHookResult = ReturnType<typeof useAssignMerchantMutation>;
export type AssignMerchantMutationResult = Apollo.MutationResult<AssignMerchantMutation>;
export type AssignMerchantMutationOptions = Apollo.BaseMutationOptions<AssignMerchantMutation, AssignMerchantMutationVariables>;
export const CreateCategoryDocument = gql`
    mutation CreateCategory($input: CreateCategoryInput!) {
  createCategory(input: $input) {
    ...PickerCategory
  }
}
    ${PickerCategoryFragmentDoc}`;
export type CreateCategoryMutationFn = Apollo.MutationFunction<CreateCategoryMutation, CreateCategoryMutationVariables>;

/**
 * __useCreateCategoryMutation__
 *
 * To run a mutation, you first call `useCreateCategoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCategoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCategoryMutation, { data, loading, error }] = useCreateCategoryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCategoryMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateCategoryMutation, CreateCategoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateCategoryMutation, CreateCategoryMutationVariables>(CreateCategoryDocument, options);
      }
export type CreateCategoryMutationHookResult = ReturnType<typeof useCreateCategoryMutation>;
export type CreateCategoryMutationResult = Apollo.MutationResult<CreateCategoryMutation>;
export type CreateCategoryMutationOptions = Apollo.BaseMutationOptions<CreateCategoryMutation, CreateCategoryMutationVariables>;
export const CreateMerchantDocument = gql`
    mutation CreateMerchant($input: CreateMerchantInput!) {
  createMerchant(input: $input) {
    ...PickerMerchant
  }
}
    ${PickerMerchantFragmentDoc}`;
export type CreateMerchantMutationFn = Apollo.MutationFunction<CreateMerchantMutation, CreateMerchantMutationVariables>;

/**
 * __useCreateMerchantMutation__
 *
 * To run a mutation, you first call `useCreateMerchantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMerchantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMerchantMutation, { data, loading, error }] = useCreateMerchantMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMerchantMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMerchantMutation, CreateMerchantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMerchantMutation, CreateMerchantMutationVariables>(CreateMerchantDocument, options);
      }
export type CreateMerchantMutationHookResult = ReturnType<typeof useCreateMerchantMutation>;
export type CreateMerchantMutationResult = Apollo.MutationResult<CreateMerchantMutation>;
export type CreateMerchantMutationOptions = Apollo.BaseMutationOptions<CreateMerchantMutation, CreateMerchantMutationVariables>;
export const ListBankAccountsDocument = gql`
    query ListBankAccounts($filters: BankAccountFilter, $ordering: [BankAccountOrder!]! = [{kind: ASC}, {name: ASC}], $pagination: OffsetPaginationInput) {
  bankAccounts(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListBankAccount
  }
}
    ${ListBankAccountFragmentDoc}`;

/**
 * __useListBankAccountsQuery__
 *
 * To run a query within a React component, call `useListBankAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListBankAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListBankAccountsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListBankAccountsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListBankAccountsQuery, ListBankAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListBankAccountsQuery, ListBankAccountsQueryVariables>(ListBankAccountsDocument, options);
      }
export function useListBankAccountsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListBankAccountsQuery, ListBankAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListBankAccountsQuery, ListBankAccountsQueryVariables>(ListBankAccountsDocument, options);
        }
export type ListBankAccountsQueryHookResult = ReturnType<typeof useListBankAccountsQuery>;
export type ListBankAccountsLazyQueryHookResult = ReturnType<typeof useListBankAccountsLazyQuery>;
export type ListBankAccountsQueryResult = Apollo.QueryResult<ListBankAccountsQuery, ListBankAccountsQueryVariables>;
export const BankPaletteSearchDocument = gql`
    query BankPaletteSearch($search: String!, $limit: Int!) {
  transactions(filters: {search: $search}, pagination: {limit: $limit}) {
    id
    counterparty
    remittance
    amount
    currency
    bookingDate
  }
  bankAccounts(filters: {search: $search}, pagination: {limit: $limit}) {
    id
    name
    iban
    currency
  }
  merchants(filters: {search: $search}, pagination: {limit: $limit}) {
    id
    name
    description
  }
  categories(
    filters: {search: $search, hidden: false}
    pagination: {limit: $limit}
  ) {
    id
    name
    description
  }
}
    `;

/**
 * __useBankPaletteSearchQuery__
 *
 * To run a query within a React component, call `useBankPaletteSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useBankPaletteSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBankPaletteSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useBankPaletteSearchQuery(baseOptions: ApolloReactHooks.QueryHookOptions<BankPaletteSearchQuery, BankPaletteSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<BankPaletteSearchQuery, BankPaletteSearchQueryVariables>(BankPaletteSearchDocument, options);
      }
export function useBankPaletteSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<BankPaletteSearchQuery, BankPaletteSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<BankPaletteSearchQuery, BankPaletteSearchQueryVariables>(BankPaletteSearchDocument, options);
        }
export type BankPaletteSearchQueryHookResult = ReturnType<typeof useBankPaletteSearchQuery>;
export type BankPaletteSearchLazyQueryHookResult = ReturnType<typeof useBankPaletteSearchLazyQuery>;
export type BankPaletteSearchQueryResult = Apollo.QueryResult<BankPaletteSearchQuery, BankPaletteSearchQueryVariables>;
export const CategoryPickerDocument = gql`
    query CategoryPicker($transaction: ID!) {
  categories(
    filters: {hidden: false}
    ordering: [{name: ASC}]
    pagination: {limit: 500}
  ) {
    ...PickerCategory
  }
  suggestCategories(transaction: $transaction, limit: 4) {
    score
    category {
      ...PickerCategory
    }
  }
}
    ${PickerCategoryFragmentDoc}`;

/**
 * __useCategoryPickerQuery__
 *
 * To run a query within a React component, call `useCategoryPickerQuery` and pass it any options that fit your needs.
 * When your component renders, `useCategoryPickerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCategoryPickerQuery({
 *   variables: {
 *      transaction: // value for 'transaction'
 *   },
 * });
 */
export function useCategoryPickerQuery(baseOptions: ApolloReactHooks.QueryHookOptions<CategoryPickerQuery, CategoryPickerQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CategoryPickerQuery, CategoryPickerQueryVariables>(CategoryPickerDocument, options);
      }
export function useCategoryPickerLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CategoryPickerQuery, CategoryPickerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CategoryPickerQuery, CategoryPickerQueryVariables>(CategoryPickerDocument, options);
        }
export type CategoryPickerQueryHookResult = ReturnType<typeof useCategoryPickerQuery>;
export type CategoryPickerLazyQueryHookResult = ReturnType<typeof useCategoryPickerLazyQuery>;
export type CategoryPickerQueryResult = Apollo.QueryResult<CategoryPickerQuery, CategoryPickerQueryVariables>;
export const MerchantPickerDocument = gql`
    query MerchantPicker($search: String, $limit: Int! = 30) {
  merchants(
    filters: {search: $search}
    ordering: [{name: ASC}]
    pagination: {limit: $limit}
  ) {
    ...PickerMerchant
  }
}
    ${PickerMerchantFragmentDoc}`;

/**
 * __useMerchantPickerQuery__
 *
 * To run a query within a React component, call `useMerchantPickerQuery` and pass it any options that fit your needs.
 * When your component renders, `useMerchantPickerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMerchantPickerQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useMerchantPickerQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MerchantPickerQuery, MerchantPickerQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MerchantPickerQuery, MerchantPickerQueryVariables>(MerchantPickerDocument, options);
      }
export function useMerchantPickerLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MerchantPickerQuery, MerchantPickerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MerchantPickerQuery, MerchantPickerQueryVariables>(MerchantPickerDocument, options);
        }
export type MerchantPickerQueryHookResult = ReturnType<typeof useMerchantPickerQuery>;
export type MerchantPickerLazyQueryHookResult = ReturnType<typeof useMerchantPickerLazyQuery>;
export type MerchantPickerQueryResult = Apollo.QueryResult<MerchantPickerQuery, MerchantPickerQueryVariables>;
export const ListTransactionsDocument = gql`
    query ListTransactions($filters: TransactionFilter, $ordering: [TransactionOrder!]! = [{bookingDate: DESC}], $pagination: OffsetPaginationInput) {
  transactions(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListTransaction
  }
}
    ${ListTransactionFragmentDoc}`;

/**
 * __useListTransactionsQuery__
 *
 * To run a query within a React component, call `useListTransactionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTransactionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListTransactionsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListTransactionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListTransactionsQuery, ListTransactionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListTransactionsQuery, ListTransactionsQueryVariables>(ListTransactionsDocument, options);
      }
export function useListTransactionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListTransactionsQuery, ListTransactionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListTransactionsQuery, ListTransactionsQueryVariables>(ListTransactionsDocument, options);
        }
export type ListTransactionsQueryHookResult = ReturnType<typeof useListTransactionsQuery>;
export type ListTransactionsLazyQueryHookResult = ReturnType<typeof useListTransactionsLazyQuery>;
export type ListTransactionsQueryResult = Apollo.QueryResult<ListTransactionsQuery, ListTransactionsQueryVariables>;
export const GetTransactionDocument = gql`
    query GetTransaction($id: ID!) {
  transaction(id: $id) {
    ...Transaction
  }
}
    ${TransactionFragmentDoc}`;

/**
 * __useGetTransactionQuery__
 *
 * To run a query within a React component, call `useGetTransactionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTransactionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTransactionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetTransactionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetTransactionQuery, GetTransactionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTransactionQuery, GetTransactionQueryVariables>(GetTransactionDocument, options);
      }
export function useGetTransactionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTransactionQuery, GetTransactionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTransactionQuery, GetTransactionQueryVariables>(GetTransactionDocument, options);
        }
export type GetTransactionQueryHookResult = ReturnType<typeof useGetTransactionQuery>;
export type GetTransactionLazyQueryHookResult = ReturnType<typeof useGetTransactionLazyQuery>;
export type GetTransactionQueryResult = Apollo.QueryResult<GetTransactionQuery, GetTransactionQueryVariables>;
export const AccountSyncsDocument = gql`
    subscription AccountSyncs {
  accountSyncs {
    accountId
    created
    updated
    pendingReplaced
  }
}
    `;

/**
 * __useAccountSyncsSubscription__
 *
 * To run a query within a React component, call `useAccountSyncsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAccountSyncsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountSyncsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useAccountSyncsSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<AccountSyncsSubscription, AccountSyncsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<AccountSyncsSubscription, AccountSyncsSubscriptionVariables>(AccountSyncsDocument, options);
      }
export type AccountSyncsSubscriptionHookResult = ReturnType<typeof useAccountSyncsSubscription>;
export type AccountSyncsSubscriptionResult = Apollo.SubscriptionResult<AccountSyncsSubscription>;