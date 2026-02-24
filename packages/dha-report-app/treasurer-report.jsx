import React, { useState } from 'react';

const TreasurerReport = () => {
  const currentDate = new Date();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Total Budget
  const [totalBudget, setTotalBudget] = useState(211948);
  const [totalSpend, setTotalSpend] = useState(190166);
  
  // Assets
  const [operatingAcct, setOperatingAcct] = useState(21580.24);
  const [bocReserve, setBocReserve] = useState(66944.22);
  const [sandySpringReserve, setSandySpringReserve] = useState(47951.76);
  const [otherAssets, setOtherAssets] = useState(4132.85);
  
  // Scapers
  const [scapersSpend, setScapersSpend] = useState(50986.43);
  
  // Landscape Committee
  const [lcBudget, setLcBudget] = useState(104865);
  const [lcSpend, setLcSpend] = useState(98730.15);
  
  // TMGA
  const [tmgaBudget, setTmgaBudget] = useState(19841);
  const [tmgaSpend, setTmgaSpend] = useState(18187.40);
  
  // Social Committee
  const [socialBudget, setSocialBudget] = useState(3500);
  const [socialSpend, setSocialSpend] = useState(1082.18);

  const calcPercent = (spend, budget) => {
    if (!budget || budget === 0) return 0;
    return ((spend / budget) * 100).toFixed(1);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatWithCommas = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const parseFormattedNumber = (str) => {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const totalAssets = operatingAcct + bocReserve + sandySpringReserve + otherAssets;
  const operatingTotal = operatingAcct + otherAssets;
  const reserveTotal = bocReserve + sandySpringReserve;

  const FormattedInput = ({ label, value, onChange }) => {
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

    const handleChange = (e) => {
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

  const BudgetCard = ({ title, budget, spend, budgetSetter, spendSetter, children }) => {
    const percent = calcPercent(spend, budget);
    const isOver = percent > 100;
    const isWarning = percent > 85 && percent <= 100;
    
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
          <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const AssetsBarChart = () => {
    const maxValue = Math.max(operatingTotal, reserveTotal);
    const operatingWidth = maxValue > 0 ? (operatingTotal / maxValue) * 100 : 0;
    const reserveWidth = maxValue > 0 ? (reserveTotal / maxValue) * 100 : 0;

    return (
      <div className="mt-4 pt-3 border-t space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Operating + Other</span>
            <span className="font-semibold text-blue-600">{formatCurrency(operatingTotal)}</span>
          </div>
          <div className="h-6 bg-gray-200 rounded overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded flex items-center justify-end pr-2 transition-all"
              style={{ width: `${operatingWidth}%` }}
            >
              {operatingWidth > 20 && (
                <span className="text-xs text-white font-medium">
                  {((operatingTotal / totalAssets) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Reserves</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(reserveTotal)}</span>
          </div>
          <div className="h-6 bg-gray-200 rounded overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded flex items-center justify-end pr-2 transition-all"
              style={{ width: `${reserveWidth}%` }}
            >
              {reserveWidth > 20 && (
                <span className="text-xs text-white font-medium">
                  {((reserveTotal / totalAssets) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-dashed">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Assets</span>
            <span className="text-xl font-bold text-gray-800">
              {formatCurrency(totalAssets)}
            </span>
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
          <h1 className="text-3xl font-bold text-gray-800">Drumaldry HOA</h1>
          <h2 className="text-2xl text-gray-600 mt-1">Treasurer's Report</h2>
          <p className="text-xl text-blue-600 font-semibold mt-2">{monthYear}</p>
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
          >
            <div className="pt-2 border-t border-dashed">
              <FormattedInput label="Scapers YTD" value={scapersSpend} onChange={setScapersSpend} />
              <p className="text-xs text-gray-500 mt-1 text-right">
                ({calcPercent(scapersSpend, lcSpend)}% of LC spend)
              </p>
            </div>
          </BudgetCard>

          {/* TMGA */}
          <BudgetCard
            title="TMGA (Management)"
            budget={tmgaBudget}
            spend={tmgaSpend}
            budgetSetter={setTmgaBudget}
            spendSetter={setTmgaSpend}
          />

          {/* Social Committee */}
          <BudgetCard
            title="Social Committee"
            budget={socialBudget}
            spend={socialSpend}
            budgetSetter={setSocialBudget}
            spendSetter={setSocialSpend}
          />

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

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Report generated for printing • {currentDate.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TreasurerReport;
