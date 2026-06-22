import React, { useState, useRef } from "react";
import { uploadReport } from "./api";

interface AdminProps {
  reportDates: string[];
  onUploaded: () => void;
  onBack: () => void;
}

const REQUIRED_KEYS = [
  "totalBudget",
  "assets",
  "landscapeCommittee",
  "tmga",
  "socialCommittee",
] as const;

const NESTED_REQUIRED: Record<string, string[]> = {
  totalBudget: ["budget", "spend", "details"],
  assets: [
    "operatingAccount",
    "bocReserve",
    "sandySpringReserve",
    "otherAssets",
  ],
  landscapeCommittee: ["budget", "spend", "scapersSpend", "details"],
  tmga: ["budget", "spend", "details"],
  socialCommittee: ["budget", "spend", "details"],
};

function getLastMonthEnd(): string {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return lastMonth.toISOString().slice(0, 10);
}

function getMonthValue(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0);
  return lastDay.toISOString().slice(0, 10);
}

function validate(
  data: Record<string, unknown>
): string[] {
  const errors: string[] = [];
  for (const key of REQUIRED_KEYS) {
    if (!(key in data)) {
      errors.push(`Missing top-level key: "${key}"`);
      continue;
    }
    const nested = NESTED_REQUIRED[key];
    if (nested && typeof data[key] === "object" && data[key] !== null) {
      for (const nk of nested) {
        if (!(nk in (data[key] as Record<string, unknown>))) {
          errors.push(`Missing "${key}.${nk}"`);
        }
      }
    }
  }
  return errors;
}

const Admin: React.FC<AdminProps> = ({ reportDates, onUploaded, onBack }) => {
  const defaultEnd = getLastMonthEnd();
  const [month, setMonth] = useState(getMonthValue(defaultEnd));
  const [jsonText, setJsonText] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reportDate = lastDayOfMonth(month);
  const existingDate = reportDates.find(
    (d) => d.slice(0, 7) === month
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJsonText(reader.result as string);
      setErrors([]);
      setSuccess("");
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setErrors([]);
    setSuccess("");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setErrors(["Invalid JSON: " + (jsonText.trim() ? "parse error" : "empty input")]);
      return;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setErrors(["JSON must be an object"]);
      return;
    }

    const validationErrors = validate(parsed);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!adminPassword) {
      setErrors(["Admin password is required to upload."]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await uploadReport(reportDate, parsed, adminPassword);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrors(["Incorrect admin password."]);
        } else {
          const body = await res.text();
          setErrors([`Upload failed (${res.status}): ${body}`]);
        }
        return;
      }
      setSuccess(`Report for ${reportDate} uploaded successfully.`);
      setJsonText("");
      setAdminPassword("");
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(onUploaded, 1000);
    } catch (e) {
      setErrors(["Network error: " + (e instanceof Error ? e.message : String(e))]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Upload Report</h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            &larr; Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 space-y-6">
          {/* Month picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setErrors([]);
                setSuccess("");
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Report date will be set to end of month: <strong>{reportDate}</strong>
            </p>
            {existingDate && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                A report for this month already exists ({existingDate}). Uploading will overwrite it.
              </p>
            )}
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload JSON file
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFile}
              className="text-sm text-gray-600"
            />
          </div>

          {/* JSON textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or paste JSON
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setErrors([]);
                setSuccess("");
              }}
              rows={14}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='{"totalBudget": {...}, "assets": {...}, ...}'
            />
          </div>

          {/* Admin password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setErrors([]);
                setSuccess("");
              }}
              placeholder="Required to upload"
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate from the viewing password — only required when uploading.
            </p>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm font-medium text-red-800 mb-1">Validation errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !jsonText.trim() || !adminPassword}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Uploading..." : existingDate ? "Upload (Overwrite)" : "Upload Report"}
          </button>
        </div>

        {/* Existing reports */}
        {reportDates.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Existing Reports
            </h3>
            <div className="flex flex-wrap gap-2">
              {[...reportDates].sort().reverse().map((d) => (
                <span
                  key={d}
                  className={`text-xs px-2 py-1 rounded-full ${
                    d.slice(0, 7) === month
                      ? "bg-amber-100 text-amber-800 font-medium"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
