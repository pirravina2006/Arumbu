import React from 'react';

const SCHEDULE = [
  { 
    age: "Birth", 
    offsetDays: 0, 
    vaccines: ["BCG", "OPV-0", "Hep B-0"] 
  },
  { 
    age: "6 Weeks", 
    offsetDays: 42, 
    vaccines: ["OPV-1", "Pentavalent-1", "Rotavirus-1", "fIPV-1"] 
  },
  { 
    age: "10 Weeks", 
    offsetDays: 70, 
    vaccines: ["OPV-2", "Pentavalent-2", "Rotavirus-2"] 
  },
  { 
    age: "14 Weeks", 
    offsetDays: 98, 
    vaccines: ["OPV-3", "Pentavalent-3", "Rotavirus-3", "fIPV-2"] 
  },
  { 
    age: "9 Months", 
    offsetDays: 270, 
    vaccines: ["MR-1", "JE-1", "PCV Booster"] 
  },
  { 
    age: "16 Months", 
    offsetDays: 480, 
    vaccines: ["MR-2", "JE-2", "DPT Booster-1", "OPV Booster"] 
  },
  { 
    age: "5 Years", 
    offsetDays: 1825, 
    vaccines: ["DPT Booster-2"] 
  },
  { 
    age: "10 Years", 
    offsetDays: 3650, 
    vaccines: ["Td (Tetanus adult diphtheria)"] 
  }
];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function VaccinationRecord({ dob, completedVaccines = [] }) {
  if (!dob) return null;

  return (
    <div className="surface" style={{ padding: "28px", marginTop: "20px" }}>
      <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "20px" }}>💉</span> Vaccination Record (Tamil Nadu NIS)
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {SCHEDULE.map((phase, idx) => {
          const scheduledDate = addDays(dob, phase.offsetDays);
          return (
            <div 
              key={idx} 
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                borderLeft: "4px solid #3b82f6"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>{phase.age}</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", backgroundColor: "#e2e8f0", padding: "4px 8px", borderRadius: "12px" }}>
                  Scheduled: {scheduledDate}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {phase.vaccines.map((vax, vIdx) => {
                  const isCompleted = completedVaccines.includes(vax);
                  return (
                    <span 
                      key={vIdx}
                      style={{
                        fontSize: "13px",
                        backgroundColor: isCompleted ? "#dcfce7" : "#fee2e2",
                        color: isCompleted ? "#166534" : "#991b1b",
                        padding: "4px 10px",
                        borderRadius: "16px",
                        fontWeight: "500",
                        border: `1px solid ${isCompleted ? "#bbf7d0" : "#fecaca"}`
                      }}
                    >
                      {vax} {isCompleted ? "(Completed)" : "(Not Vaccinated)"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
