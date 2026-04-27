import React, { useState, useEffect, useCallback } from 'react';
import { hasToken, clearToken, fetchReportDates, fetchReport, type ReportData, type BudgetAlert } from './api';
import Login from './Login';
import Admin from './Admin';

interface DetailItem {
  name: string;
  amount: number;
}

interface FormattedInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

interface BudgetCardProps {
  title: string;
  budget: number;
  spend: number;
  budgetSetter: (value: number) => void;
  spendSetter: (value: number) => void;
  children?: React.ReactNode;
  yearPercent?: number;
}

type View = 'dashboard' | 'admin';

const App = () => {
  const [authenticated, setAuthenticated] = useState(hasToken());
  const [reportDates, setReportDates] = useState<string[]>([]);
  const [reportCache, setReportCache] = useState<Record<string, ReportData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('dashboard');

  const loadAllReports = useCallback(async (dates: string[]) => {
    setLoading(true);
    setError('');
    try {
      const entries = await Promise.all(
        dates.map(async (d) => [d, await fetchReport(d)] as const)
      );
      setReportCache(Object.fromEntries(entries));
      setReportDates(dates);
    } catch (e) {
      if (!hasToken()) {
        setAuthenticated(false);
      } else {
        setError('Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, if we have a stored token, try to load
  useEffect(() => {
    if (authenticated) {
      fetchReportDates()
        .then((dates) => loadAllReports(dates))
        .catch(() => {
          if (!hasToken()) setAuthenticated(false);
          else setError('Failed to load reports');
        });
    }
  }, [authenticated, loadAllReports]);

  const handleLogin = (dates: string[]) => {
    setAuthenticated(true);
    loadAllReports(dates);
  };

  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
    setReportDates([]);
    setReportCache({});
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button onClick={handleLogout} className="text-blue-600 underline">Sign out</button>
        </div>
      </div>
    );
  }

  const handleUploaded = async () => {
    try {
      const dates = await fetchReportDates();
      await loadAllReports(dates);
    } catch {
      // ignore — loadAllReports handles errors
    }
    setView('dashboard');
  };

  if (reportDates.length === 0 && view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">No reports available.</p>
          <button
            onClick={() => setView('admin')}
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            Upload a report
          </button>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return <Admin reportDates={reportDates} onUploaded={handleUploaded} onBack={() => setView('dashboard')} />;
  }

  return <ReportDashboard reportDates={reportDates} reportCache={reportCache} onLogout={handleLogout} onAdmin={() => setView('admin')} />;
};

interface ReportDashboardProps {
  reportDates: string[];
  reportCache: Record<string, ReportData>;
  onLogout: () => void;
  onAdmin: () => void;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({ reportDates, reportCache, onLogout, onAdmin }) => {
  const currentDate = new Date();
  const sortedDates = [...reportDates].sort().reverse();

  // Date selector for report data
  const [selectedDate, setSelectedDate] = useState(sortedDates[0]);
  const reportData = reportCache[selectedDate];

  // Total Budget
  const [totalBudget, setTotalBudget] = useState(reportData.totalBudget.budget);
  const [totalSpend, setTotalSpend] = useState(reportData.totalBudget.spend);

  // Assets
  const [operatingAcct, setOperatingAcct] = useState(reportData.assets.operatingAccount);
  const [bocReserve, setBocReserve] = useState(reportData.assets.bocReserve);
  const [sandySpringReserve, setSandySpringReserve] = useState(reportData.assets.sandySpringReserve);
  const [otherAssets, setOtherAssets] = useState(reportData.assets.otherAssets);

  // Scapers
  const [scapersSpend, setScapersSpend] = useState(reportData.landscapeCommittee.scapersSpend);

  // Landscape Committee
  const [lcBudget, setLcBudget] = useState(reportData.landscapeCommittee.budget);
  const [lcSpend, setLcSpend] = useState(reportData.landscapeCommittee.spend);

  // TMGA
  const [tmgaBudget, setTmgaBudget] = useState(reportData.tmga.budget);
  const [tmgaSpend, setTmgaSpend] = useState(reportData.tmga.spend);

  // Social Committee
  const [socialBudget, setSocialBudget] = useState(reportData.socialCommittee.budget);
  const [socialSpend, setSocialSpend] = useState(reportData.socialCommittee.spend);

  // Reserve Fund
  const [reserveContributions, setReserveContributions] = useState(reportData.reserveFund?.contributions ?? 0);
  const [reserveExpenditures, setReserveExpenditures] = useState(reportData.reserveFund?.expenditures ?? 0);

  // Update state when selected date changes
  useEffect(() => {
    const data = reportCache[selectedDate];
    if (!data) return;
    setTotalBudget(data.totalBudget.budget);
    setTotalSpend(data.totalBudget.spend);
    setOperatingAcct(data.assets.operatingAccount);
    setBocReserve(data.assets.bocReserve);
    setSandySpringReserve(data.assets.sandySpringReserve);
    setOtherAssets(data.assets.otherAssets);
    setScapersSpend(data.landscapeCommittee.scapersSpend);
    setLcBudget(data.landscapeCommittee.budget);
    setLcSpend(data.landscapeCommittee.spend);
    setTmgaBudget(data.tmga.budget);
    setTmgaSpend(data.tmga.spend);
    setSocialBudget(data.socialCommittee.budget);
    setSocialSpend(data.socialCommittee.spend);
    setReserveContributions(data.reserveFund?.contributions ?? 0);
    setReserveExpenditures(data.reserveFund?.expenditures ?? 0);
  }, [selectedDate, reportCache]);

  const calcPercent = (spend: number, budget: number) => {
    if (!budget || budget === 0) return 0;
    return ((spend / budget) * 100).toFixed(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatWithCommas = (value: number | string | null | undefined) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const parseFormattedNumber = (str: string) => {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const totalAssets = operatingAcct + bocReserve + sandySpringReserve + otherAssets;
  const operatingTotal = operatingAcct + otherAssets;
  const reserveTotal = bocReserve + sandySpringReserve;

  const FormattedInput = ({ label, value, onChange }: FormattedInputProps) => {
    const [displayValue, setDisplayValue] = useState(formatWithCommas(value));
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = () => {
      setIsFocused(true);
      setDisplayValue(value.toString());
    };

    const handleBlur = () => {
      setIsFocused(false);
      const parsed = parseFormattedNumber(displayValue);
      onChange(parsed);
      setDisplayValue(formatWithCommas(parsed));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (isFocused) {
        setDisplayValue(val);
      } else {
        setDisplayValue(formatWithCommas(val));
      }
    };

    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatWithCommas(value));
      }
    }, [value, isFocused]);

    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-gray-700 text-sm">{label}</label>
        <div className="flex items-center">
          <span className="text-gray-500 mr-1">$</span>
          <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="w-32 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    );
  };

  const BudgetCard = ({ title, budget, spend, budgetSetter, spendSetter, children, yearPercent }: BudgetCardProps) => {
    const percent = calcPercent(spend, budget);
    const isOver = Number(percent) > 100;
    const isWarning = Number(percent) > 85 && Number(percent) <= 100;

    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">{title}</h3>

        <div className="space-y-2">
          <FormattedInput label="Budget" value={budget} onChange={budgetSetter} />
          <FormattedInput label="YTD Spend" value={spend} onChange={spendSetter} />
          {children}
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">% of Budget</span>
            <span className={`text-xl font-bold ${isOver ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600'}`}>
              {percent}%
            </span>
          </div>
          {yearPercent !== undefined && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-600">% of Year</span>
              <span className="text-sm font-semibold text-blue-500">{yearPercent.toFixed(1)}%</span>
            </div>
          )}
          <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden relative">
            {yearPercent !== undefined ? (
              <>
                {/* Render the larger value first as background, smaller on top */}
                {Number(percent) >= yearPercent ? (
                  <>
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(Number(percent), 100)}%` }}
                    />
                    <div
                      className="h-full rounded-full transition-all bg-blue-400 absolute top-0 left-0"
                      style={{ width: `${Math.min(yearPercent, 100)}%` }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className="h-full rounded-full transition-all bg-blue-400"
                      style={{ width: `${Math.min(yearPercent, 100)}%` }}
                    />
                    <div
                      className={`h-full rounded-full transition-all absolute top-0 left-0 ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(Number(percent), 100)}%` }}
                    />
                  </>
                )}
              </>
            ) : (
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(Number(percent), 100)}%` }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const AssetsBarChart = () => {
    const operatingPct = totalAssets > 0 ? (operatingTotal / totalAssets) * 100 : 0;
    const reservePct = totalAssets > 0 ? (reserveTotal / totalAssets) * 100 : 0;

    return (
      <div className="mt-4 pt-3 border-t space-y-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Total Assets</span>
          <span className="text-xl font-bold text-gray-800">
            {formatCurrency(totalAssets)}
          </span>
        </div>

        <div className="h-7 bg-gray-200 rounded overflow-hidden flex">
          <div
            className="h-full bg-blue-500 flex items-center justify-center transition-all"
            style={{ width: `${operatingPct}%` }}
          >
            {operatingPct > 15 && (
              <span className="text-xs text-white font-medium">
                {operatingPct.toFixed(0)}%
              </span>
            )}
          </div>
          <div
            className="h-full bg-emerald-500 flex items-center justify-center transition-all"
            style={{ width: `${reservePct}%` }}
          >
            {reservePct > 15 && (
              <span className="text-xs text-white font-medium">
                {reservePct.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-blue-600 font-medium">Operating + Other {formatCurrency(operatingTotal)}</span>
          <span className="text-emerald-600 font-medium">Reserves {formatCurrency(reserveTotal)}</span>
        </div>
      </div>
    );
  };

  const DetailCard = ({ title, details }: { title: string; details: DetailItem[] }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">{title}</h3>
      <div className="space-y-2">
        {details.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-600">{item.name}</span>
            <span className="text-gray-800 font-medium">{formatCurrency(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const ReserveFundCard = () => {
    const report = reportCache[selectedDate];
    const reserveData = report.reserveFund;
    const netChange = reserveContributions - reserveExpenditures + (reserveData?.interestIncome ?? 0);
    const isNegative = netChange < 0;

    // Get previous period data for comparison
    const dates = [...reportDates].sort();
    const currentIndex = dates.indexOf(selectedDate);
    const previousDate = currentIndex > 0 ? dates[currentIndex - 1] : null;
    const previousData = previousDate ? reportCache[previousDate] : null;

    return (
      <div className={`bg-white rounded-lg shadow-md p-4 border ${isNegative ? 'border-amber-300' : 'border-gray-200'}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Reserve Fund</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-gray-700 text-sm">Total Reserves</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(reserveTotal)}</span>
          </div>

          <FormattedInput label="YTD Contributions" value={reserveContributions} onChange={setReserveContributions} />
          <FormattedInput label="YTD Expenditures" value={reserveExpenditures} onChange={setReserveExpenditures} />
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Net Change YTD</span>
            <span className={`text-xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
              {isNegative ? '-' : '+'}{formatCurrency(Math.abs(netChange))}
            </span>
          </div>

          {previousData && (
            <div className="mt-3 pt-2 border-t border-dashed">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prior Period Reserves</span>
                <span className="text-gray-600">
                  {formatCurrency(previousData.assets.bocReserve + previousData.assets.sandySpringReserve)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Change from Prior</span>
                <span className={`font-medium ${reserveTotal < (previousData.assets.bocReserve + previousData.assets.sandySpringReserve) ? 'text-red-600' : 'text-green-600'}`}>
                  {reserveTotal < (previousData.assets.bocReserve + previousData.assets.sandySpringReserve) ? '-' : '+'}
                  {formatCurrency(Math.abs(reserveTotal - (previousData.assets.bocReserve + previousData.assets.sandySpringReserve)))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ExpenditureDetails = () => {
    const report = reportCache[selectedDate];
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
          Expenditure Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DetailCard title="Total Operating Budget" details={report.totalBudget.details} />
          <DetailCard title="Landscape Committee" details={report.landscapeCommittee.details} />
          <DetailCard title="TMGA (Management)" details={report.tmga.details} />
          <DetailCard title="Social Committee" details={report.socialCommittee.details} />
        </div>

        {/* Reserve Fund Projects */}
        {report.reserveFund?.projects && report.reserveFund.projects.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Reserve Fund Expenditures</h3>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="space-y-2">
                {report.reserveFund.projects.map((project, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{project.name}</span>
                    <span className="text-gray-800 font-medium">{formatCurrency(project.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t border-gray-300 mt-2">
                  <span className="font-semibold text-gray-700">Total Reserve Expenditures</span>
                  <span className="font-bold text-gray-800">{formatCurrency(report.reserveFund.expenditures)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const YearEndProjections = () => {
    const periodDate = new Date(selectedDate + 'T00:00:00');
    const monthsElapsed = periodDate.getMonth() + 1;

    const categories = [
      { name: 'Total Operating', budget: totalBudget, spend: totalSpend },
      { name: 'Landscape Committee', budget: lcBudget, spend: lcSpend },
      { name: 'TMGA (Management)', budget: tmgaBudget, spend: tmgaSpend },
      { name: 'Social Committee', budget: socialBudget, spend: socialSpend },
    ];

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
          Year-End Budget Projections
        </h2>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Budget</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">YTD Spend</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Projected</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Variance</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((cat) => {
                const projected = (cat.spend / monthsElapsed) * 12;
                const variance = cat.budget - projected;
                const isOver = variance < 0;
                return (
                  <tr key={cat.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(cat.budget)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(cat.spend)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-800">{formatCurrency(projected)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                      {isOver ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isOver ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {isOver ? 'Over Budget' : 'Under Budget'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-right">
          * Projections based on {monthsElapsed} months of spending data
        </p>
      </div>
    );
  };

  const VarianceSummary = () => {
    const report = reportCache[selectedDate];
    const variances = report.budgetVariances;
    if (!variances) return null;

    const overBudget = variances
      .filter(v => v.actual > v.budget)
      .map(v => ({ ...v, variance: v.actual - v.budget }))
      .sort((a, b) => b.variance - a.variance);

    const underBudget = variances
      .filter(v => v.actual <= v.budget)
      .map(v => ({ ...v, variance: v.budget - v.actual }))
      .sort((a, b) => b.variance - a.variance);

    const totalOver = overBudget.reduce((sum, v) => sum + v.variance, 0);
    const totalUnder = underBudget.reduce((sum, v) => sum + v.variance, 0);
    const netVariance = totalOver - totalUnder;

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
          Budget Variance Summary
        </h2>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <p className="text-gray-600 mb-4">
            Despite Snow Removal being significantly over budget, offsetting savings in other categories
            kept the overall budget variance minimal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Over Budget Column */}
            <div>
              <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Over Budget
              </h3>
              <div className="space-y-2">
                {overBudget.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="text-red-600 font-medium">+{formatCurrency(item.variance)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 font-semibold">
                  <span className="text-gray-800">Total Over</span>
                  <span className="text-red-700">+{formatCurrency(totalOver)}</span>
                </div>
              </div>
            </div>

            {/* Under Budget Column */}
            <div>
              <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Under Budget (Savings)
              </h3>
              <div className="space-y-2">
                {underBudget.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="text-green-600 font-medium">-{formatCurrency(item.variance)}</span>
                  </div>
                ))}
                {underBudget.length > 4 && (
                  <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-500 italic">+ {underBudget.length - 4} more items</span>
                    <span className="text-green-600 font-medium">
                      -{formatCurrency(underBudget.slice(4).reduce((sum, v) => sum + v.variance, 0))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 font-semibold">
                  <span className="text-gray-800">Total Savings</span>
                  <span className="text-green-700">-{formatCurrency(totalUnder)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Variance */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">Net Variance</span>
              <span className={`text-xl font-bold ${netVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {netVariance > 0 ? '+' : '-'}{formatCurrency(Math.abs(netVariance))}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-end mb-2 gap-3">
            <button
              onClick={onAdmin}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Upload Report
            </button>
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Sign out
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Drumaldry HOA</h1>
          <h2 className="text-2xl text-gray-600 mt-1">Treasurer's Report</h2>
          <div className="mt-3 flex justify-center items-center gap-2">
            <label htmlFor="date-selector" className="text-gray-600">Report Date:</label>
            <select
              id="date-selector"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-blue-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortedDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Total Budget */}
          <BudgetCard
            title="Total Operating Budget"
            budget={totalBudget}
            spend={totalSpend}
            budgetSetter={setTotalBudget}
            spendSetter={setTotalSpend}
            yearPercent={(new Date(selectedDate + 'T00:00:00').getMonth() + 1) / 12 * 100}
          />

          {/* Assets Card */}
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Total Assets</h3>

            <div className="space-y-2">
              <FormattedInput label="Operating Account" value={operatingAcct} onChange={setOperatingAcct} />
              <FormattedInput label="BoC Reserve" value={bocReserve} onChange={setBocReserve} />
              <FormattedInput label="Sandy Spring Reserve" value={sandySpringReserve} onChange={setSandySpringReserve} />
              <FormattedInput label="Other Assets" value={otherAssets} onChange={setOtherAssets} />
            </div>

            <AssetsBarChart />
          </div>

          {/* Landscape Committee */}
          <BudgetCard
            title="Landscape Committee"
            budget={lcBudget}
            spend={lcSpend}
            budgetSetter={setLcBudget}
            spendSetter={setLcSpend}
            yearPercent={(new Date(selectedDate + 'T00:00:00').getMonth() + 1) / 12 * 100}
          >
            <div className="pt-2 border-t border-dashed">
              <FormattedInput label="Scapers YTD" value={scapersSpend} onChange={setScapersSpend} />
              <p className="text-xs text-gray-500 mt-1 text-right">
                ({calcPercent(scapersSpend, lcSpend)}% of LC spend)
              </p>
            </div>
            {(reportData as ReportData & { budgetAlerts?: BudgetAlert[] }).budgetAlerts?.map((alert, i) => (
              <div key={i} className="mt-2 pt-2 border-t border-dashed text-sm">
                <div className="flex items-center gap-1 text-amber-700">
                  <span>⚠️</span>
                  <span>{alert.category}: {formatCurrency(Math.abs(alert.variance))} over budget</span>
                </div>
                {alert.note && <p className="text-xs text-gray-500 ml-5">{alert.note}</p>}
              </div>
            ))}
          </BudgetCard>

          {/* TMGA */}
          <BudgetCard
            title="TMGA (Management)"
            budget={tmgaBudget}
            spend={tmgaSpend}
            budgetSetter={setTmgaBudget}
            spendSetter={setTmgaSpend}
            yearPercent={(new Date(selectedDate + 'T00:00:00').getMonth() + 1) / 12 * 100}
          />

          {/* Social Committee */}
          <BudgetCard
            title="Social Committee"
            budget={socialBudget}
            spend={socialSpend}
            budgetSetter={setSocialBudget}
            spendSetter={setSocialSpend}
            yearPercent={(new Date(selectedDate + 'T00:00:00').getMonth() + 1) / 12 * 100}
          />

          {/* Reserve Fund */}
          <ReserveFundCard />

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 border-b border-blue-200 pb-2">Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Budget Remaining</span>
                <span className={`font-semibold ${totalBudget - totalSpend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalBudget - totalSpend)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">Total Reserves</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(reserveTotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">Operating Cash</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(operatingTotal)}
                </span>
              </div>

              {reportData?.priorYearDeficit != null && reportData.priorYearDeficit > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-600">Prior Year Deficit</span>
                  <span className="font-semibold text-red-600">
                    −{formatCurrency(reportData.priorYearDeficit)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-blue-200">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium">Net Assets</span>
                  <span className="font-bold text-blue-700 text-lg">
                    {formatCurrency(totalAssets)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Variance Summary */}
        <VarianceSummary />

        {/* Expenditure Details Section */}
        <ExpenditureDetails />

        {/* Year-End Projections Section */}
        <YearEndProjections />

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Report generated for printing • {currentDate.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default App;
