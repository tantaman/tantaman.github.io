export const CSS = `
.gc-table {
  text-align: left;
  border-collapse: collapse;
  margin: 10px 0;
  width: 400px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
}

.gc-table thead tr {
  background-color: #009879;
  color: #ffffff;
  text-align: left;
}

.gc-table th,
.gc-table td {
  padding: 12px 15px;
}

.gc-table tbody tr {
  border-bottom: 1px solid #dddddd;
}

.gc-table tbody tr:nth-of-type(even) {
  background-color: #f3f3f3;
}

.gc-tbl-contain {
  text-align: center;
}

.gc-tbl-a thead tr {
  background-color: #980000;
  color: #ffffff;
  text-align: left;
}

.gc-tbl-b thead tr {
  background-color: #0e0098;
  color: #ffffff;
  text-align: left;
}

.gc-tbl-a tbody tr:last-of-type {
  border-bottom: 2px solid #980000;
}

.gc-tbl-b tbody tr:last-of-type {
  border-bottom: 2px solid #0e0098;
}

.gc-flip-text {
  transform: scale(-1, 1);
}

.gc-pair-tables {
  display: flex;
  gap: 10px;
}

.gc-merge-contain {
  text-align: center;
}

.gc-tbl-merge {
  margin-top: 15px;
  margin-left: auto;
  margin-right: auto;
  width: 400px;
}

.gc-tbl-merge thead tr {
  background-color: #630098;
  color: #ffffff;
  text-align: left;
}

.gc-tbl-merge tbody tr:last-of-type {
  border-bottom: 2px solid #630098;
}

.gc-tbl-merge .gc-a-row {
  background-color: #9800008c !important;
}

.gc-tbl-merge .gc-b-row {
  background-color: #0e00988a !important;
}

.gc-ex-tie button {
  height: 50px;
}

.gc-btn {
  background-color: #009879;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  padding: 8px 12px;
  font-weight: 600;
}

button.gc-btn:not(:disabled) {
  cursor: pointer;
}

button.gc-btn:disabled {
  background: #dddddd;
}

.gc-tie-contain {
  display: flex;
  gap: 10px;
}

.gc-ex-tie label {
  cursor: pointer;
}

.gc-fieldset {
  border: 1px solid #dddddd;
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
}

.gc-fieldset > label {
  margin: 0 5px;
}

.gc-fieldset > label > input {
  margin-right: 5px;
}
`;
