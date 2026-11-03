import { getFunctionName } from "convex/server";
import { profile, tickets, thread } from "./data.js";
export function useQuery(ref, args) {
  if (args === "skip") return undefined;
  const name = getFunctionName(ref);
  const sampleJob = {id:'sample-job',title:'Weekday newborn care and family support',description:'Care for an infant during agreed weekday hours. '.repeat(10),category:'newborn_maternity_nanny',serviceTypes:['live_out','newborn_maternity_care'],location:'Nairobi and surrounding neighbourhoods',payMin:15000,payMax:20000,payPeriod:'monthly',status:'open',applicationsCount:2,employerName:'Example Parent'};
  if(name==='jobs:alerts')return {applications:window.__RESPONSIVE_ROLE__==='employer'?2:0,offers:window.__RESPONSIVE_ROLE__==='caregiver'?1:0,more:false};
  if(name==='jobs:list')return {jobs:[sampleJob],cursor:null};
  if(name==='jobs:detail')return {...sampleJob,ownApplication:window.__RESPONSIVE_ROLE__==='caregiver'?{id:'sample-application',status:'offered',message:'I have experience caring for newborns and supporting families. '.repeat(8),proposedPay:18000,payPeriod:'monthly'}:null};
  if(name==='jobs:applications')return {applications:[{id:'pending-proposal',status:'submitted',message:'My childcare proposal and experience. '.repeat(10),proposedPay:18000,payPeriod:'monthly',profile:{...profile,verification_status:'pending',adult_confirmed:false}},{id:'verified-proposal',status:'submitted',message:'Experienced caregiver available for this role.',proposedPay:19000,payPeriod:'monthly',profile:{...profile,adult_confirmed:true}}],cursor:null};
  if(name==='jobs:mine')return {applications:[{id:'sample-application',jobId:sampleJob.id,jobTitle:sampleJob.title,status:'offered',jobStatus:'open'}],cursor:null};
  if (name === "accounts:authSettings")
    return { emailReady: true, testSender: true };
  if (name === "adminDashboard:failedEmails") return {emails: [], more: false};
  if (name === "adminDashboard:overview") return { queues: Object.fromEntries(['identity','tickets','waiting','reports','operations','payments','failedEmails'].map(key => [key, {count: 0, more: false}])), overdueTickets: 0, dueSoonTickets: 0, notifications: [] };
  if (name === "marketplace:read") return args.path === '/admin/reports' ? {reports: []} : {submissions: []};
  if (name === "manualPayments:pending")
    return {
      payments: [
        {
          id: "sample-payment",
          amount: 300,
          plan_code: "employer_30_days",
          receipt: "TESTCODE01",
          phone: "0712345678",
          created_at: "2026-11-01",
          account: {
            name: "Example Parent",
            email: "sample.parent.with.a.long.address@example.test",
            role: "employer",
            restricted: false,
          },
        },
      ],
      cursor: null,
    };
  if (name === "support:list") return tickets;
  if (name === "support:thread") return thread;
  if (name === "privacy:status")
    return { deletionRequestedAt: null, requests: [] };
  if (name === "adminSecurity:status")
    return { configured: true, enrolled: true };
  return [];
}
export function useMutation() {
  return async () => {
    throw new Error("Responsive fixtures do not accept mutations.");
  };
}
export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: false };
}
