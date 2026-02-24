const TOKEN_KEY = "dha_token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

async function authedFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401) {
    clearToken();
  }
  return res;
}

export interface DetailItem {
  name: string;
  amount: number;
}

export interface BudgetAlert {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  note?: string;
}

export interface BudgetVariance {
  name: string;
  budget: number;
  actual: number;
}

export interface ReportData {
  reportDate: string;
  budgetAlerts?: BudgetAlert[];
  budgetVariances?: BudgetVariance[];
  reserveFund?: {
    contributions: number;
    expenditures: number;
    interestIncome?: number;
    projects?: DetailItem[];
  };
  totalBudget: {
    budget: number;
    spend: number;
    details: DetailItem[];
  };
  assets: {
    operatingAccount: number;
    bocReserve: number;
    sandySpringReserve: number;
    otherAssets: number;
  };
  landscapeCommittee: {
    budget: number;
    spend: number;
    scapersSpend: number;
    details: DetailItem[];
  };
  tmga: {
    budget: number;
    spend: number;
    details: DetailItem[];
  };
  socialCommittee: {
    budget: number;
    spend: number;
    details: DetailItem[];
  };
}

export async function fetchReportDates(): Promise<string[]> {
  const res = await authedFetch("/api/dha/reports");
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return (json.reports as { report_date: string }[]).map((r) => r.report_date);
}

export async function fetchReport(date: string): Promise<ReportData> {
  const res = await authedFetch(`/api/dha/reports/${date}`);
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return json.data as ReportData;
}
