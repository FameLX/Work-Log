/* ===================================================================
   INHOUSE APPLICATION — STATIC PROTOTYPE SEED DATA
   No backend / no database. This object is the entire "database" and
   is cloned into localStorage on first run (see app.js: DB.load()).
   =================================================================== */

const STATUS_DEFS = [
  { id: 'not_started',   label: 'Not Started',   color: '#8b949e' },
  { id: 'contacted',     label: 'Contacted',     color: '#58a6ff' },
  { id: 'in_development',label: 'In Development',color: '#a371f7' },
  { id: 'testing',       label: 'Testing',       color: '#d29922' },
  { id: 'certified',     label: 'Certified',     color: '#3fb950' },
  { id: 'cutover',       label: 'Cutover',       color: '#238636' },
  { id: 'on_hold',       label: 'On Hold',       color: '#f0883e' },
  { id: 'ceased',        label: 'Ceased',        color: '#f85149' },
];

// ---- Permission tree definitions (System > Menu > Function) ----
// Two independent categories: "program" and "report".
const PERMISSION_TREE = {
  program: [
    {
      id: 'sys-admin', name: 'Admin',
      menus: [
        {
          id: 'menu-user', name: 'User',
          functions: [
            { id: 'fn-user-search', name: 'User Search' },
            { id: 'fn-user-add', name: 'Add User' },
            { id: 'fn-user-edit', name: 'Edit User' },
            { id: 'fn-user-view', name: 'View User' },
            { id: 'fn-user-delete', name: 'Delete User' },
            { id: 'fn-user-active', name: 'Active User Status' },
            { id: 'fn-user-inactive', name: 'Inactive User Status' },
            { id: 'fn-user-reset-pw', name: 'Reset Password' },
            { id: 'fn-user-export', name: 'Export User Report' },
          ],
        },
        {
          id: 'menu-user-audit', name: 'User Audit Events',
          functions: [
            { id: 'fn-audit-search', name: 'User Audit Events Search' },
          ],
        },
        {
          id: 'menu-ucp', name: 'UCP Configuration',
          functions: [
            { id: 'fn-ucp-config', name: 'UCP Configuration' },
          ],
        },
      ],
    },
    {
      id: 'sys-km', name: 'Knowledge Management',
      menus: [
        {
          id: 'menu-km-general', name: 'General Information',
          functions: [
            { id: 'fn-km-general-view', name: 'View General Information' },
            { id: 'fn-km-general-edit', name: 'Edit General Information' },
          ],
        },
        {
          id: 'menu-km-project', name: 'Projects',
          functions: [
            { id: 'fn-km-project-view', name: 'View Project' },
            { id: 'fn-km-project-edit', name: 'Edit Project Background' },
            { id: 'fn-km-data-add', name: 'Add Data Entry' },
            { id: 'fn-km-data-edit', name: 'Edit Data Entry' },
            { id: 'fn-km-data-delete', name: 'Delete Data Entry' },
            { id: 'fn-km-credentials-view', name: 'View Credentials' },
          ],
        },
      ],
    },
    {
      id: 'sys-engagement', name: 'Engagement Log',
      menus: [
        {
          id: 'menu-eng-airline', name: 'Airline',
          functions: [
            { id: 'fn-eng-airline-view', name: 'View Airline' },
            { id: 'fn-eng-airline-add', name: 'Add Airline' },
            { id: 'fn-eng-airline-edit', name: 'Edit Airline' },
            { id: 'fn-eng-airline-status', name: 'Update Engagement Status' },
          ],
        },
        {
          id: 'menu-eng-host', name: 'Host',
          functions: [
            { id: 'fn-eng-host-view', name: 'View Host' },
            { id: 'fn-eng-host-add', name: 'Add Host' },
            { id: 'fn-eng-host-edit', name: 'Edit Host' },
            { id: 'fn-eng-host-status', name: 'Update Engagement Status' },
          ],
        },
        {
          id: 'menu-eng-template', name: 'Coordination Templates',
          functions: [
            { id: 'fn-eng-template-manage', name: 'Manage Templates' },
          ],
        },
      ],
    },
  ],
  report: [
    {
      id: 'sys-reports', name: 'Reports',
      menus: [
        {
          id: 'menu-report-progress', name: 'Engagement Reports',
          functions: [
            { id: 'fn-report-progress-export', name: 'Progress Report Export' },
            { id: 'fn-report-quicksum', name: 'Quick Sum Monthly Report' },
          ],
        },
        {
          id: 'menu-report-km', name: 'KM Reports',
          functions: [
            { id: 'fn-report-km-audit', name: 'KM Audit Report' },
          ],
        },
      ],
    },
  ],
};

function allFunctionIds(category) {
  const ids = [];
  PERMISSION_TREE[category].forEach(sys => sys.menus.forEach(menu => menu.functions.forEach(fn => ids.push(fn.id))));
  return ids;
}

// Engagement Page fields (icao/homeCountry/dcsHost.../ars/dateContacted/goLiveStatus/
// cutoverDirection/port/crewSubmission/checklists) back the per-airline "View Details" popup
// in the Engagement Log. checklists here are duplicated FROM a KM Data Entry's example
// checklist (see IAPI_STANDARD_CHECKLIST_ITEMS below and duplicateChecklist() in app.js) —
// the KM copy stays an unchanged reference; edits happen on the airline's own copy.
const SEED_AIRLINES = [
  // Thailand
  { id: 'al-th-1', projectId: 'proj-th', name: 'Thai Airways', iata: 'TG', status: 'active',
    icao: 'THA', homeCountry: 'Thailand', dcsHostInboundId: 'host-th-1', dcsHostOutboundId: 'host-th-1',
    ars: 'Amadeus Altéa', dateContacted: '2026-01-15', goLiveStatus: 'live', cutoverDirection: 'both', port: 'BKK', crewSubmission: 'yes',
    checklists: [] },
  { id: 'al-th-2', projectId: 'proj-th', name: 'Bangkok Airways', iata: 'PG', status: 'active',
    icao: 'PGA', homeCountry: 'Thailand', dcsHostInboundId: 'host-th-2', dcsHostOutboundId: 'host-th-2',
    ars: 'ARINC vMUSE', dateContacted: '2026-02-01', goLiveStatus: 'in_progress', cutoverDirection: 'inbound', port: 'BKK, USM', crewSubmission: 'yes',
    checklists: [] },
  { id: 'al-th-3', projectId: 'proj-th', name: 'Nok Air', iata: 'DD', status: 'active',
    icao: 'NOK', homeCountry: 'Thailand', dcsHostInboundId: 'host-th-1', dcsHostOutboundId: 'host-th-2',
    ars: 'Navitaire', dateContacted: '', goLiveStatus: 'not_started', cutoverDirection: '', port: 'DMK', crewSubmission: 'no',
    checklists: [] },
  // Laos
  { id: 'al-la-1', projectId: 'proj-la', name: 'Lao Airlines', iata: 'QV', status: 'active',
    icao: 'LAO', homeCountry: 'Laos', dcsHostInboundId: 'host-la-1', dcsHostOutboundId: 'host-la-1',
    ars: 'Sabre', dateContacted: '2026-01-20', goLiveStatus: 'live', cutoverDirection: 'both', port: 'VTE', crewSubmission: 'yes',
    checklists: [] },
  { id: 'al-la-2', projectId: 'proj-la', name: 'Vietnam Airlines', iata: 'VN', status: 'active',
    icao: 'HVN', homeCountry: 'Vietnam', dcsHostInboundId: 'host-la-2', dcsHostOutboundId: 'host-la-2',
    ars: 'Sabre', dateContacted: '2026-03-05', goLiveStatus: 'in_progress', cutoverDirection: 'inbound', port: 'VTE', crewSubmission: 'yes',
    checklists: [] },
  { id: 'al-la-3', projectId: 'proj-la', name: 'Thai Smile', iata: 'WE', status: 'inactive',
    icao: 'THD', homeCountry: 'Thailand', dcsHostInboundId: '', dcsHostOutboundId: '',
    ars: '', dateContacted: '', goLiveStatus: 'not_started', cutoverDirection: '', port: '', crewSubmission: 'no',
    checklists: [] },
  // PNG
  { id: 'al-pg-1', projectId: 'proj-pg', name: 'Air Niugini', iata: 'PX', status: 'active',
    icao: 'ANG', homeCountry: 'Papua New Guinea', dcsHostInboundId: 'host-pg-1', dcsHostOutboundId: 'host-pg-1',
    ars: 'Amadeus Altéa', dateContacted: '2026-01-10', goLiveStatus: 'live', cutoverDirection: 'both', port: 'POM', crewSubmission: 'yes',
    checklists: [] },
  { id: 'al-pg-2', projectId: 'proj-pg', name: 'PNG Air', iata: 'CG', status: 'active',
    icao: 'TOK', homeCountry: 'Papua New Guinea', dcsHostInboundId: 'host-pg-2', dcsHostOutboundId: '',
    ars: 'Navitaire', dateContacted: '', goLiveStatus: 'not_started', cutoverDirection: '', port: 'POM', crewSubmission: 'no',
    checklists: [] },
  { id: 'al-pg-3', projectId: 'proj-pg', name: 'Qantas', iata: 'QF', status: 'active',
    icao: 'QFA', homeCountry: 'Australia', dcsHostInboundId: 'host-pg-1', dcsHostOutboundId: 'host-pg-1',
    ars: 'Amadeus Altéa', dateContacted: '2026-02-14', goLiveStatus: 'in_progress', cutoverDirection: 'outbound', port: 'POM', crewSubmission: 'yes',
    checklists: [] },
  // Liberia
  { id: 'al-lr-1', projectId: 'proj-lr', name: 'ASKY Airlines', iata: 'KP', status: 'active',
    icao: 'KPA', homeCountry: 'Togo', dcsHostInboundId: 'host-lr-1', dcsHostOutboundId: 'host-lr-1',
    ars: 'Sabre', dateContacted: '2026-04-01', goLiveStatus: 'in_progress', cutoverDirection: 'inbound', port: 'ROB', crewSubmission: 'yes',
    checklists: [] },
  { id: 'al-lr-2', projectId: 'proj-lr', name: 'Kenya Airways', iata: 'KQ', status: 'active',
    icao: 'KQA', homeCountry: 'Kenya', dcsHostInboundId: 'host-lr-2', dcsHostOutboundId: 'host-lr-2',
    ars: 'Amadeus Altéa', dateContacted: '', goLiveStatus: 'not_started', cutoverDirection: '', port: 'ROB', crewSubmission: 'no',
    checklists: [] },
  { id: 'al-lr-3', projectId: 'proj-lr', name: 'Weasua Air Transport', iata: 'W7', status: 'inactive',
    icao: 'WTA', homeCountry: 'Liberia', dcsHostInboundId: '', dcsHostOutboundId: '',
    ars: '', dateContacted: '', goLiveStatus: 'not_started', cutoverDirection: '', port: '', crewSubmission: 'no',
    checklists: [] },
];

// Host operation criteria: operationType (DCS/ARS/Both — for host operation), contactDate, and
// one engagementData box per data type (MQ Type, PSK Provided By, Message Format, Documents).
function defaultEngagementData(overrides) {
  overrides = overrides || {};
  return ['dt-app', 'dt-iapi', 'dt-pnr', 'dt-paxlst'].map(dataTypeId => Object.assign(
    { dataTypeId, mqType: 'server', pskProvidedBy: 'si_team', messageFormat: '', documents: [] },
    overrides[dataTypeId] || {}
  ));
}
const SEED_HOSTS = [
  { id: 'host-th-1', projectId: 'proj-th', name: 'SITA Border Management', status: 'active',
    operationType: 'Both', contactDate: '2026-01-05',
    contacts: [ { id: 'hc-1', name: 'Alex Tan', role: 'Account Manager', phone: '+65 6541 1000', email: 'alex.tan@sita.aero' } ],
    engagementData: defaultEngagementData({
      'dt-iapi': { mqType: 'server', pskProvidedBy: 'si_team', messageFormat: 'UN/EDIFACT PAXLST (CUSRES response)' },
      'dt-pnr': { mqType: 'client', pskProvidedBy: 'host', messageFormat: 'IATA PNRGOV XML' },
    }), checklists: [] },
  { id: 'host-th-2', projectId: 'proj-th', name: 'ARINC vMUSE', status: 'active',
    operationType: 'DCS', contactDate: '2026-01-12',
    contacts: [ { id: 'hc-2', name: 'Maria Cruz', role: 'Support Lead', phone: '+1 410 266 4000', email: 'maria.cruz@arinc.example' } ],
    engagementData: defaultEngagementData(), checklists: [] },
  { id: 'host-la-1', projectId: 'proj-la', name: 'SITA Border Management', status: 'active',
    operationType: 'Both', contactDate: '2026-01-08',
    contacts: [ { id: 'hc-3', name: 'Alex Tan', role: 'Account Manager', phone: '+65 6541 1000', email: 'alex.tan@sita.aero' } ],
    engagementData: defaultEngagementData(), checklists: [] },
  { id: 'host-la-2', projectId: 'proj-la', name: 'Direct Network Link', status: 'active',
    operationType: 'ARS', contactDate: '',
    contacts: [ { id: 'hc-4', name: 'Somsak Vong', role: 'Network Engineer', phone: '+856 21 500 200', email: 'somsak.v@dnl.example' } ],
    engagementData: defaultEngagementData(), checklists: [] },
  { id: 'host-pg-1', projectId: 'proj-pg', name: 'SITA Border Management', status: 'active',
    operationType: 'Both', contactDate: '2026-01-10',
    contacts: [ { id: 'hc-5', name: 'Alex Tan', role: 'Account Manager', phone: '+65 6541 1000', email: 'alex.tan@sita.aero' } ],
    engagementData: defaultEngagementData(), checklists: [] },
  { id: 'host-pg-2', projectId: 'proj-pg', name: 'ARINC vMUSE', status: 'inactive',
    operationType: 'DCS', contactDate: '',
    contacts: [ { id: 'hc-6', name: 'Maria Cruz', role: 'Support Lead', phone: '+1 410 266 4000', email: 'maria.cruz@arinc.example' } ],
    engagementData: defaultEngagementData(), checklists: [] },
  { id: 'host-lr-1', projectId: 'proj-lr', name: 'SITA Border Management', status: 'active',
    operationType: 'Both', contactDate: '2026-02-01',
    contacts: [ { id: 'hc-7', name: 'Alex Tan', role: 'Account Manager', phone: '+65 6541 1000', email: 'alex.tan@sita.aero' } ],
    engagementData: defaultEngagementData(), checklists: [] },
  { id: 'host-lr-2', projectId: 'proj-lr', name: 'ARINC vMUSE', status: 'active',
    operationType: 'DCS', contactDate: '2026-02-03',
    contacts: [ { id: 'hc-8', name: 'Maria Cruz', role: 'Support Lead', phone: '+1 410 266 4000', email: 'maria.cruz@arinc.example' } ],
    engagementData: defaultEngagementData(), checklists: [] },
];

// ---------------------------------------------------------------------------------
// KM checklist items — columns match the real "iAPI THA" engagement checklist reference
// exactly: Steps (phase) / No. / Check / List / Remark / Announce Space / Coordinator.
// Templates live only in KM (DB.data.kmDataEntries[].checklists); duplicateChecklist() in
// app.js clones one onto a specific airline (DB.data.airlines[].checklists), adding a
// per-item done/date pair that only makes sense once it's tracking a real engagement.
// ---------------------------------------------------------------------------------
let _ckSeq = 0;
function ckId() { return 'ckitem-' + (++_ckSeq); }
function ckItem(step, no, list, extra) {
  return Object.assign({ id: ckId(), step, no, list, remark: '', announceSpace: '', coordinator: '' }, extra || {});
}
function ckBanner(style, text) {
  return { id: ckId(), banner: true, bannerStyle: style, list: text };
}

const IAPI_STANDARD_CHECKLIST_ITEMS = [
  ckItem('Pre-Engage', '1', 'Invitation from CE team / Request from Operator/Host', { announceSpace: 'Zulip : Carrier Engagement Team' }),
  ckItem('Pre-Engage', '2', "Review the timeline prior to the airline's operational start",
    { remark: '- สายการบินที่มี Connectivity แล้ว หรือ มีลากาทำ Engage ก่อน Operate มากกว่า 1 เดือน\n- ถ้าไม่เข้าเงื่อนไข Forward to SITA' }),

  ckItem('Contact', '1', 'Service Form provided to Operator/Host', { remark: 'ถ้าสายการบินใช้ DCS มากกว่า 1 ให้รอกแยกฟอร์ม', announceSpace: 'Zulip : Carrier Engagement Team' }),
  ckItem('Contact', '2', 'Service Form received from Operator/Host',
    { remark: 'ตรวจสอบว่าได้ส่งข้อมูลลูกเรือผ่าน DCS ด้วยหรือไหม / ตรวจสอบว่ากรอกครบทุกช่องหรือไม่', announceSpace: 'Zulip : Carrier Engagement Team' }),
  ckItem('Contact', '2.1', 'Check Airline Name and IATA Code'),
  ckItem('Contact', '2.2', 'Check Airline Contact Number and Email'),
  ckItem('Contact', '2.3', 'Check PAXLST/CUSRES and Version', { remark: 'Supported Version D/12B , D15B' }),
  ckItem('Contact', '2.4', 'Check MQ Server to MQ Server or MQ Client to MQ Server'),
  ckItem('Contact', '2.5', 'Check DCS Provider'),
  ckItem('Contact', '3', 'Commit Service Form to SVN', { announceSpace: 'Zulip : Carrier Engagement Team' }),
  ckItem('Contact', '4', 'Check Airline in Master Data [OC Cert.]', { remark: 'ตรวจสอบว่ามี Airline ที่ทำ Cert. ใน OC Cert > Master Data > Airline แล้วหรือยัง' }),
  ckBanner('red', 'ถ้ามี Connectivity อยู่แล้ว ข้ามกรอบแดงได้เลย'),

  ckItem('Development', '1', 'Configuration Form provided to Operator/Host', { announceSpace: 'Zulip : Carrier Engagement Team' }),
  ckItem('Development', '2', 'Configuration Form received from Operator/Host', { announceSpace: 'Zulip : Carrier Engagement Team' }),
  ckItem('Development', '3', 'Configuration Form provided to SI/SD team', { announceSpace: 'Zulip : iAPI THA - L2 - Technical', coordinator: 'SI Tawan [O] , SDPG Phronphun.S [Meaw]' }),
  ckItem('Development', '4', 'PSK Generate from SI team / PSK provide from Operator/Host',
    { remark: 'Send via Direct Message to Responsibility person', announceSpace: 'Zulip : iAPI THA - L2 - Technical', coordinator: 'SI Tawan [O]' }),
  ckItem('Development', '5', 'VPN Connectivity Configuration', { remark: 'VPN Status check : Up or not', announceSpace: 'Zulip : iAPI THA - L2 - Technical', coordinator: 'SI Tawan [O]' }),
  ckItem('Development', '6', 'Check Packets in VPN Tunnel', { announceSpace: 'Zulip : iAPI THA - L2 - Technical', coordinator: 'SI Tawan [O]' }),
  ckItem('Development', '7', 'MQ Status Check', { remark: 'Telnet Status Check : Running or not', announceSpace: 'Zulip : iAPI THA - L2 - Technical', coordinator: 'SDPG Phronphun.S [Meaw]' }),
  ckItem('Development', '8', 'Test Short Message', { remark: 'From SD to Host / From Host to SD', announceSpace: 'Zulip : iAPI THA - L2 - Technical', coordinator: 'SDPG Phronphun.S [Meaw]' }),
  ckItem('Development', '9', 'Inform Airline Connectivity In Place', { announceSpace: 'Email Loop' }),
  ckItem('Development', '10', 'Check Channel Status', { remark: 'Active / Inactive', announceSpace: 'Zulip : iAPI THA - L2 - Technical', coordinator: 'NOC' }),

  ckItem('Certificate', '1', 'Test Case Scenarios provided to Operator/Host', { remark: 'Note for version sent', announceSpace: 'Email Loop' }),
  ckItem('Certificate', '2', 'Check the test result in OC Cert. at Menu : iAPI > iAPI Certificate Verification',
    { remark: 'To check in detail > consulting with CE team > iAPI Internal', announceSpace: 'Email Loop, Zulip : iAPI Internal > Airlines Topic, Zulip : Carrier Engagement Team', coordinator: 'SA Phattarawadee.K [Jun]' }),
  ckItem('Certificate', '2.1', 'Add Airline to process test results'),
  ckItem('Certificate', '2.2', 'Check test result for Both Directions', { remark: 'If test crew, change check box from passenger to crew' }),
  ckItem('Certificate', '2.2.1', 'Check test result for Inbound / Skipped Outbound'),
  ckItem('Certificate', '2.2.2', 'Check test result for Outbound / Skipped Inbound'),
  ckItem('Certificate', '2.3', '(In case not certify) Request for PAXLST'),
  ckItem('Certificate', '2.4', 'Request a screenshot for CUSRES received'),
  ckItem('Certificate', '3', 'Service Interruption Alert: Request Contact in Certified inform email',
    { announceSpace: 'Zulip : iAPI THA - L2 - Technical > Channel Inactive status', coordinator: 'SI Thanawat.s [Warn]' }),
  ckItem('Certificate', '4', 'Configure the Sender Code of each airline',
    { remark: 'ต้องมีข้อมูลวัน Cutover ก่อน', announceSpace: 'Zulip : iAPI Internal > Airlines Topic', coordinator: 'SA Phattarawadee.K [Jun]' }),

  ckItem('Cutover', '1', 'Data Validation on Cutover Date',
    { remark: 'Check at ;\n- OC Prod. > Flight Checkin Transaction\n- iAPI Flight Close\n- Search Logs (for Flight Close Message transaction within 2 hours from Dep. Time)', announceSpace: 'Zulip : Carrier Engagement Team' }),
  ckItem('Cutover', '2', 'KEYIN Add Airline', { remark: 'Add remark if DCS more than 1' }),
  ckItem('Cutover', '3', 'Inform the relevant person'),
  ckItem('Cutover', '3.1', 'CE Team', { announceSpace: 'Zulip : Carrier Engagement Team > Airlines Topic' }),
  ckItem('Cutover', '3.2', 'Airlines', { announceSpace: 'Email Loop' }),
  ckItem('Cutover', '3.3', 'Technical Team', { announceSpace: 'Zulip : iAPI Internal > Airlines Topic' }),
  ckItem('Cutover', '3.4', 'CX Team',
    { announceSpace: 'Zulip : CX TH - APPS&PNR THA > News & Updates', coordinator: 'CSC TH Team , Trainer Team (Thai) , SIT Contact and Service Center' }),

  ckItem('Post-Cutover', '4', 'Monitor Airline for 2 Weeks'),
  ckItem('Post-Cutover', '4.1', 'Week 1'),
  ckItem('Post-Cutover', '4.2', 'Week 2'),
  ckBanner('black', 'หากมี Feedback จาก Production ให้รับมาแล้วประสาน CSC ต่อ'),
];

// Small template checklists for the other data-type Data Entries — same new column shape,
// content kept minimal since only the iAPI THA checklist above has a real reference to copy.
function simpleChecklistItems(pairs) {
  return pairs.map((text, i) => ckItem('Contact', String(i + 1), text));
}
// Clones a KM template checklist's items onto an airline, seeding done/date so the demo
// data shows what a duplicated-and-in-progress checklist looks like on an Engagement Page.
function seedAirlineChecklist(name, sourceEntryId, sourceEntryTitle, dataTypeId, items, doneCount) {
  return {
    id: uid_static('achk'), name, sourceEntryId, sourceEntryTitle, dataTypeId,
    items: items.map((i, idx) => i.banner
      ? { ...i, id: uid_static('acki') }
      : { ...i, id: uid_static('acki'), done: idx < doneCount, date: idx < doneCount ? '2026-02-10' : '' }),
  };
}
let _uidSeq = 0;
function uid_static(prefix) { return prefix + '-' + (++_uidSeq); }

const PNR_TH_CHECKLIST_ITEMS = simpleChecklistItems(['PNR push endpoint configured', 'Sample PNR validated']);
const IAPI_LA_CHECKLIST_ITEMS = simpleChecklistItems(['SITA GG mailbox provisioned', 'Test batch accepted']);
const IAPI_PG_CHECKLIST_ITEMS = simpleChecklistItems(['Airline contact confirmed', 'Test environment credentials issued']);
const IAPI_LR_CHECKLIST_ITEMS = simpleChecklistItems(['Airline contact confirmed']);
// Host-side connectivity checklist — duplicated onto a Host (not an Airline) per data type via
// the same "Duplicate" flow in KM, just targeting Host instead.
const HOST_CONNECTIVITY_CHECKLIST_ITEMS = [
  ckItem('Contact', '1', 'Connectivity Form send/Receive'),
  ckItem('Development', '1', 'VPN Start'),
  ckItem('Development', '2', 'Initiate Traffic test'),
  ckItem('Development', '3', 'VPN Completed'),
  ckItem('Development', '4', 'MQ Start'),
  ckItem('Development', '5', 'Test Message'),
  ckItem('Development', '6', 'MQ Completed'),
];

// Seed a few airlines with an already-duplicated checklist so the Engagement Page has
// something to show out of the box; every other airline starts with checklists: [] and
// picks one up via the "Duplicate to Airline" action on a KM Data Entry's Checklist tab.
byId_static(SEED_AIRLINES, 'al-th-1').checklists.push(
  seedAirlineChecklist('Standard iAPI Engagement Checklist', 'kmd-th-1', 'Interactive Advance Passenger Information (iAPI)', 'dt-iapi', IAPI_STANDARD_CHECKLIST_ITEMS, 8)
);
byId_static(SEED_AIRLINES, 'al-th-2').checklists.push(
  seedAirlineChecklist('Standard PNR Checklist', 'kmd-th-2', 'Passenger Name Record (PNR)', 'dt-pnr', PNR_TH_CHECKLIST_ITEMS, 2)
);
byId_static(SEED_AIRLINES, 'al-la-2').checklists.push(
  seedAirlineChecklist('Standard iAPI Checklist', 'kmd-la-1', 'Interactive Advance Passenger Information (iAPI)', 'dt-iapi', IAPI_LA_CHECKLIST_ITEMS, 2)
);
byId_static(SEED_AIRLINES, 'al-pg-1').checklists.push(
  seedAirlineChecklist('Standard iAPI Checklist', 'kmd-pg-1', 'Interactive Advance Passenger Information (iAPI)', 'dt-iapi', IAPI_PG_CHECKLIST_ITEMS, 1)
);
// Seed one host with an already-duplicated Host Connectivity Checklist, same demo purpose as
// the airline seeding above; every other host starts with checklists: [] and picks one up via
// "Duplicate" (target: Host) on a KM Data Entry's Checklist tab.
byId_static(SEED_HOSTS, 'host-th-1').checklists.push(
  seedAirlineChecklist('Standard Host Connectivity Checklist', 'kmd-th-1', 'Interactive Advance Passenger Information (iAPI)', 'dt-iapi', HOST_CONNECTIVITY_CHECKLIST_ITEMS, 3)
);
function byId_static(arr, id) { return arr.find(x => x.id === id); }

// ---------------------------------------------------------------------------------
// KM Project sub-menu (TOC tree) — shared menu SHAPE across every project, matching the
// team's real HelpNDoc table of contents. Structure is fixed/shared; the actual page
// content per project is stored separately in DB.data.kmTocPages, keyed by (projectId,
// nodeId), so each project can have its own content under the same navigational shape.
// Two folders (iAPI, PNR) link straight into the matching KM Data Entry instead of a
// standalone content page, since that content already lives in the 7-tab Data view.
// ---------------------------------------------------------------------------------
function tocDoc(title, opts) { return Object.assign({ type: 'doc', title }, opts || {}); }
function tocFolder(title, children, opts) { return Object.assign({ type: 'folder', title, children }, opts || {}); }
// Ids are stable (assigned once, independent of title/position) so that reordering, renaming,
// indenting/outdenting a node in the KM Project TOC editor never orphans its kmTocPages content.
function assignTocIds(nodes) {
  nodes.forEach(n => {
    n.id = uid_static('toc');
    if (n.children) assignTocIds(n.children);
  });
}
// Each project gets its OWN independent, editable copy of the shared starting shape (deep
// clone with fresh ids) — TOC structure edits (add/delete/move/indent/outdent) in app.js only
// ever touch DB.data.kmTocTrees[projectId], never this shared template.
function cloneTocTree(nodes) {
  return nodes.map(n => {
    const copy = Object.assign({}, n);
    copy.id = uid_static('toc');
    if (n.children) copy.children = cloneTocTree(n.children);
    return copy;
  });
}

const KM_TOC_TREE = [
  tocDoc('Regulations and Timeline'),
  tocDoc('Available Port in Thailand'),
  tocFolder('Advance Passenger Processing System (APPS)', [
    tocDoc('Integrate APP via SITA GG'),
    tocFolder('Message Response', [
      tocDoc('Message Codes 5XXX'), tocDoc('Message Codes 6XXX'), tocDoc('Message Codes 8XXX'), tocDoc('Message Codes 9XXX'),
    ]),
    tocDoc('System Down Procedure', { deprecated: true }),
  ]),
  tocFolder('Interactive Advance Passenger Information (iAPI)', [
    tocDoc('Integrate iAPI via ARINC'),
    tocDoc('Integrate iAPI via Direct Network'),
    tocFolder('Message Response', [
      tocDoc('Message Codes 1XXX'), tocDoc('Message Codes 2XXX'), tocDoc('Message Codes 3XXX'),
    ]),
    tocFolder('Engagement Process', [
      tocDoc('Contact'),
      tocFolder('Development', [tocDoc('Configuration Form')]),
      tocFolder('Certificate', [
        tocDoc('Data Connectivity'),
        tocFolder('Data verification', [
          tocFolder('iAPI Message Structure', [tocDoc('PAXLST'), tocDoc('CUSRES')]),
        ]),
        tocDoc('Service Interruption Alert'),
      ]),
      tocDoc('Cutover'),
    ]),
    tocDoc('Progress Report', { deprecated: true }),
    tocFolder('Wording Template', [tocDoc('Email Template'), tocDoc('Zulip Template')]),
    tocDoc('System Down Procedure', { deprecated: true }),
  ]),
  tocDoc('Accommodation'),
  tocFolder('C.I.Q.', [
    tocFolder('Engagement Process', [
      tocDoc('Contact'),
      tocFolder('Development', [tocDoc('PRL Message via SFTP'), tocDoc('Batch Template via SFTP')]),
      tocDoc('Certificate'),
      tocDoc('Cutover'),
    ]),
    tocDoc('Email Template', { deprecated: true }),
  ]),
  tocFolder('Integration APP/iAPI with TDAC', [
    tocFolder('Engagement Process', [tocDoc('Contact'), tocDoc('Development'), tocDoc('Certificate'), tocDoc('Cutover')]),
    tocDoc('Additional Information'),
    tocDoc('System Down Procedure', { deprecated: true }),
  ]),
  tocDoc('Customs Passenger Pre-Screening', { deprecated: true }),
  tocFolder('Passenger Name Record (PNR)', [
    tocFolder('Engagement Process', [
      tocDoc('Contact'),
      tocFolder('Development', [tocDoc('Configuration Form')]),
      tocFolder('Certificate', [
        tocFolder('Data Connectivity', [tocDoc('VPN Configuration'), tocDoc('MQ Configuration')]),
        tocFolder('Data Verification', [
          tocFolder('PNR Message Structure', [
            tocDoc('PNR_01'), tocDoc('PNR_02'), tocDoc('PNR_03'), tocDoc('PNR_04_A/D'), tocDoc('PNR_05'),
            tocDoc('PNR_06'), tocDoc('PNR_07'), tocDoc('PNR_08'), tocDoc('PNR_09'), tocDoc('PNR_10_A/D'),
          ]),
        ]),
        tocDoc('Service Interruption Alert'),
      ]),
      tocDoc('Cutover'),
    ]),
    tocFolder('Progress Report', [tocDoc('Monthly Information')]),
    tocFolder('Wording Template', [tocDoc('Email Template'), tocDoc('Zulip Template')]),
    tocDoc('GDPR Law'),
    tocDoc('System Down Procedure', { deprecated: true }),
  ]),
  tocFolder('System Using', [
    tocFolder('CUS System', [
      tocFolder('Travel Information', [tocDoc('Traveller and Baggage Search'), tocDoc('Airline Incomplete CIQ Information')]),
      tocFolder('Passenger Name Record System', [tocDoc('Search Personal Data'), tocDoc('PNR Message Process Log'), tocDoc('Certificate Verification')]),
    ]),
    tocFolder('OC System', [
      tocFolder('Certification Environment', [
        tocDoc('Master Data'),
        tocFolder('Travel Information', [tocDoc('Flight Display'), tocDoc('Traveller Search'), tocDoc('Number of Traveller by Flight')]),
        tocFolder('iAPI System', [tocDoc('iAPI Certification Verification')]),
        tocFolder('Passenger Name Record System', [tocDoc('PNR Message Process Log')]),
      ]),
      tocFolder('Production Environment', [
        tocDoc('Master Data'),
        tocFolder('Travel Information', [tocDoc('Traveller Search'), tocDoc('Flight Check-in Transaction'), tocDoc('Number of Traveller by Flight'), tocDoc('Number of Traveller by Flight (AOT)')]),
        tocDoc('Report'),
        tocFolder('Passenger Name Record System', [tocDoc('Manage Airline Engagement Process'), tocDoc('PNR Message Process Log'), tocDoc('PNR Airline Certification Progress Report')]),
        tocDoc('Keyin Airline'),
        tocFolder('iAPI System', [tocDoc('Flight Close Transaction Check')]),
      ]),
    ]),
    tocFolder('Airline Portal (ALP)', [
      tocDoc('Carrier Registration'),
      tocDoc('Individual Check-in'),
      tocFolder('Batch Check-in', [tocDoc('APP'), tocDoc('PNR')]),
      tocFolder('Secure File Transfer Protocol (sFTP)', [
        tocDoc('Contact'),
        tocFolder('Development', [tocDoc('Public Key'), tocDoc('Private Key'), tocDoc('Simple Password'), tocDoc('CE Credential')]),
        tocDoc('Certificate'),
        tocDoc('Cutover'),
      ]),
      tocDoc('Cancel Data'),
      tocFolder('Wording Template', [tocDoc('Email Template'), tocDoc('Zulip Template')]),
      tocDoc('Progress Report'),
      tocFolder('Troubleshoot', [
        tocDoc('Authentication failed'), tocDoc('Connection Time Out'), tocDoc('Connection Abort'),
        tocDoc('Date/Time Out of Range'), tocDoc('Internal Server Error'), tocDoc('Path Data not Transfer'),
      ]),
    ]),
    tocFolder('User Airline Portal (UALP)', [tocDoc('Carrier Approval'), tocDoc('Carrier Administrator Approval')]),
  ]),
];
assignTocIds(KM_TOC_TREE);

// General Information's own TOC — a single site-wide tree (no per-project copies), editable
// exactly like a Project's TOC (Add/Edit/Delete/Move/Indent/Outdent). Each seeded leaf's
// targetId matches a DOM id on the General Information page so clicking it scrolls there
// instead of navigating; row-derived ids (kmgen-ic-row-N etc.) must stay lined up with
// kmGeneral.internalContacts / externalContact / credentialsList / cooperation.internal order.
// Each top-level topic also carries a `section` key naming which kmGeneral panel(s) it maps
// to (see app.js KM_GENERAL_SECTION_RENDERERS) — clicking anywhere inside that topic (folder
// or leaf) shows only that section's content in the workspace, not the whole page.
const KM_GENERAL_TOC_TREE = [
  tocFolder('Contact Information', [
    tocFolder('Internal Contact', [
      tocDoc('Customer Experiences', { targetId: 'kmgen-ic-row-0' }),
      tocDoc('Project & Account Management', { targetId: 'kmgen-ic-row-1' }),
      tocDoc('System Analysis', { targetId: 'kmgen-ic-row-2' }),
      tocDoc('Software Design & Programming', { targetId: 'kmgen-ic-row-3' }),
      tocDoc('System & Infrastructure', { targetId: 'kmgen-ic-row-4' }),
    ], { targetId: 'kmgen-sec-internal-contact' }),
    tocFolder('External Contact', [
      tocDoc('SITA', { targetId: 'kmgen-ec-row-0' }),
      tocDoc('AOC (Airport Operations Center)', { targetId: 'kmgen-ec-row-1' }),
      tocDoc('AOT', { targetId: 'kmgen-ec-row-2' }),
      tocDoc('CUSTOMS', { targetId: 'kmgen-ec-row-3' }),
      tocDoc('IMMIGRATION', { targetId: 'kmgen-ec-row-4' }),
      tocDoc('AIRLINES', { targetId: 'kmgen-ec-row-5' }),
    ], { targetId: 'kmgen-sec-external-contact' }),
  ], { targetId: 'kmgen-sec-internal-contact', section: 'contact' }),
  tocFolder('URL & Username & Password', [
    tocDoc('CE General Information', { targetId: 'kmgen-cred-row-0' }),
    tocDoc('Thailand APPS & PNR', { targetId: 'kmgen-cred-row-1' }),
    tocDoc('LAO PDR APPS & PNR', { targetId: 'kmgen-cred-row-2' }),
    tocDoc('PNG e-Border Solutions', { targetId: 'kmgen-cred-row-3' }),
    tocDoc('LBR e-Border Solutions', { targetId: 'kmgen-cred-row-4' }),
  ], { targetId: 'kmgen-sec-credentials', section: 'credentials' }),
  tocFolder('Follow Up Guideline', [
    tocDoc('KPI', { targetId: 'kmgen-fu-kpi' }),
    tocDoc('Internal Follow Up', { targetId: 'kmgen-fu-internal' }),
    tocDoc('External Follow Up', { targetId: 'kmgen-fu-external' }),
  ], { targetId: 'kmgen-sec-followup', section: 'followup' }),
  tocFolder('Meeting Procedure', [
    tocFolder('Internal Meeting', [tocDoc('Internal MOM', { targetId: 'kmgen-mt-internal-mom' })], { targetId: 'kmgen-mt-internal' }),
    tocFolder('External Meeting', [tocDoc('External MOM', { targetId: 'kmgen-mt-external-mom' })], { targetId: 'kmgen-mt-external' }),
  ], { targetId: 'kmgen-sec-meeting', section: 'meeting' }),
  tocFolder('Relevant Team Cooperation', [
    tocFolder('Internal', [
      tocDoc('Admin Cooperation', { targetId: 'kmgen-coop-int-row-0' }),
      tocDoc('CSC Cooperation', { targetId: 'kmgen-coop-int-row-1' }),
      tocDoc('SA Cooperation', { targetId: 'kmgen-coop-int-row-2' }),
      tocDoc('SD Cooperation', { targetId: 'kmgen-coop-int-row-3' }),
      tocDoc('SI Cooperation', { targetId: 'kmgen-coop-int-row-4' }),
      tocDoc('TN Cooperation', { targetId: 'kmgen-coop-int-row-5' }),
    ], { targetId: 'kmgen-coop-internal' }),
    tocFolder('External', [
      tocFolder('Host Information', [
        tocDoc('iAPI', { targetId: 'kmgen-coop-host' }),
        tocDoc('PNR', { targetId: 'kmgen-coop-host' }),
      ], { targetId: 'kmgen-coop-host' }),
    ], { targetId: 'kmgen-coop-host' }),
  ], { targetId: 'kmgen-sec-coop', section: 'coop' }),
];
assignTocIds(KM_GENERAL_TOC_TREE);

const DEFAULT_DB = {
  // Bump this whenever the shape of DEFAULT_DB changes. DB.load() compares it against
  // whatever's cached in localStorage and resets automatically on mismatch, so a schema
  // change here can never leave a stale/incompatible object silently crashing renders.
  meta: { version: 13 },

  // Each project's own editable TOC structure (Add/Edit/Delete/Move/Indent/Outdent in the KM
  // Project sidebar all mutate this array, never the shared KM_TOC_TREE template above).
  kmTocTrees: {
    'proj-th': cloneTocTree(KM_TOC_TREE),
    'proj-la': cloneTocTree(KM_TOC_TREE),
    'proj-pg': cloneTocTree(KM_TOC_TREE),
    'proj-lr': cloneTocTree(KM_TOC_TREE),
  },

  // Single site-wide, independently editable TOC for General Information (see comment above
  // KM_GENERAL_TOC_TREE's definition).
  kmGeneralTocTree: KM_GENERAL_TOC_TREE,

  // Per-project content for kmTocTrees leaf pages. Entries are created lazily — a topic has
  // none until the user picks a format ("Free Text" or "Table") the first time. Shape:
  // { projectId, nodeId, format: 'richtext'|'table', content? (HTML string), table? ({columns,rows}) }.
  kmTocPages: [],

  // Same lazily-created per-topic content, for General Information topics that don't map to
  // one of the built-in structured sections (i.e. any topic added via "+ Add Topic" — the
  // original seeded topics all carry a targetId and keep using the structured views instead).
  // Shape: { nodeId, format: 'richtext'|'table', content?, table? }.
  kmGeneralPages: [],

  userGroups: [
    { id: 'grp-admin', name: 'Admin', description: 'Full system access, including user administration.' },
    { id: 'grp-members', name: 'Members', description: 'KM and Engagement Log edit access; no user administration.' },
    { id: 'grp-user', name: 'User', description: 'View-only access across the application.' },
  ],

  groupPermissions: {
    'grp-admin': { program: allFunctionIds('program'), report: allFunctionIds('report') },
    'grp-members': {
      program: [
        'fn-km-general-view', 'fn-km-general-edit',
        'fn-km-project-view', 'fn-km-project-edit', 'fn-km-data-add', 'fn-km-data-edit', 'fn-km-data-delete', 'fn-km-credentials-view',
        'fn-eng-airline-view', 'fn-eng-airline-add', 'fn-eng-airline-edit', 'fn-eng-airline-status',
        'fn-eng-host-view', 'fn-eng-host-add', 'fn-eng-host-edit', 'fn-eng-host-status',
        'fn-eng-template-manage',
      ],
      report: ['fn-report-progress-export', 'fn-report-quicksum'],
    },
    'grp-user': {
      program: ['fn-km-general-view', 'fn-km-project-view', 'fn-eng-airline-view', 'fn-eng-host-view'],
      report: [],
    },
  },

  users: [
    {
      id: 'u-1', name: 'Ananya', surname: 'Suksawat', email: 'admin@example.com', username: 'admin',
      password: 'admin123', groupId: 'grp-admin', status: 'active', mustChangePassword: false,
    },
    {
      id: 'u-2', name: 'Kittipong', surname: 'Wongsakul', email: 'member@example.com', username: 'member',
      password: 'member123', groupId: 'grp-members', status: 'active', mustChangePassword: false,
    },
    {
      id: 'u-3', name: 'Sirinya', surname: 'Chaiyaporn', email: 'viewer@example.com', username: 'viewer',
      password: 'viewer123', groupId: 'grp-user', status: 'active', mustChangePassword: false,
    },
  ],

  sites: [
    { id: 'site-km', key: 'km', name: 'Knowledge Management (KM)', description: 'Reference knowledge base per project: contacts, credentials, engagement steps, checklists, FAQ.' },
    { id: 'site-engagement', key: 'engagement', name: 'Engagement Log', description: 'Live airline & host certification tracking and progress reporting.' },
  ],

  countries: [
    { id: 'ctry-th', name: 'Thailand' },
    { id: 'ctry-la', name: 'Laos' },
    { id: 'ctry-pg', name: 'Papua New Guinea' },
    { id: 'ctry-lr', name: 'Liberia' },
  ],

  projects: [
    {
      id: 'proj-th', countryId: 'ctry-th', name: 'Thailand APPS&PNR',
      background: '<p>Advance Passenger Processing System (APPS) and Passenger Name Record (PNR) engagement program for airlines operating into Thailand, run jointly with Thai CIQ (Customs, Immigration, Quarantine) authorities.</p><p>Scope covers APP submission via SITA/ARINC, iAPI interactive messaging, and PNR push/pull integration for all scheduled international carriers.</p>',
    },
    {
      id: 'proj-la', countryId: 'ctry-la', name: 'LAO PDR APPS&PNR',
      background: '<p>APPS & PNR rollout for carriers serving Lao PDR, aligned to the regional border-security data exchange standard.</p><p>Engagement is coordinated through the national Immigration Department with a smaller carrier base than Thailand, prioritising iAPI first.</p>',
    },
    {
      id: 'proj-pg', countryId: 'ctry-pg', name: 'PNG e-Border Solutions',
      background: '<p>e-Border Solutions program for Papua New Guinea covering Advance Passenger Information (API/APP), interactive API, and PNR message certification for airlines and their ground handling hosts.</p>',
    },
    {
      id: 'proj-lr', countryId: 'ctry-lr', name: 'LBR e-Border Solutions',
      background: '<p>e-Border Solutions engagement program for Liberia, newly stood up to bring regional carriers onto APP/iAPI/PNR reporting ahead of the national border-management go-live.</p>',
    },
  ],

  dataTypes: [
    { id: 'dt-app', code: 'APP', name: 'Advance Passenger Processing (APP)' },
    { id: 'dt-iapi', code: 'iAPI', name: 'Interactive API (iAPI)' },
    { id: 'dt-pnr', code: 'PNR', name: 'Passenger Name Record (PNR)' },
    { id: 'dt-paxlst', code: 'PAXLST', name: 'Passenger List (PAXLST)' },
  ],

  statuses: STATUS_DEFS,

  permissionTree: PERMISSION_TREE,

  // ---------------- KM: General Information (site-wide, single record) ----------------
  // Intentionally blank — General Information's sample content (contacts, credentials, KPI/
  // meeting/cooperation text) was seed placeholder data; the KM Structure (topic tree) is kept
  // so real content can be filled in per-topic via KM > General Information.
  kmGeneral: {
    internalContacts: [],
    externalContact: [],
    credentialsList: [],
    followUp: { kpi: '', internal: '', external: '' },
    meeting: { internalMeeting: '', internalMOM: '', externalMeeting: '', externalMOM: '' },
    cooperation: { internal: {}, external: { hostInformation: '' } },
  },

  // ---------------- KM: Data entries — one per data-type/topic per project (2 each), ----------------
  // matching the real KM tree (e.g. "Interactive Advance Passenger Information (iAPI)",
  // "Passenger Name Record (PNR)" as top-level topics under each project, each with its own
  // Engagement Process). Checklists are duplicated PER AIRLINE ENGAGEMENT within the topic's
  // Checklist tab, rather than creating a separate Data entry per airline.
  kmDataEntries: [
    // ---- Thailand: iAPI + PNR ----
    {
      id: 'kmd-th-1', projectId: 'proj-th', dataTypeId: 'dt-iapi', title: 'Interactive Advance Passenger Information (iAPI)',
      documents: [
        { id: 'doc-1', name: 'iAPI Integration Guide v3.pdf', uploadedAt: '2026-03-10' },
        { id: 'doc-2', name: 'Message Mapping Spec.xlsx', uploadedAt: '2026-04-02' },
      ],
      steps: [
        { id: 'step-1', order: 1, title: 'Contact', description: 'Send onboarding pack and schedule kick-off call with the airline.' },
        { id: 'step-2', order: 2, title: 'Development', description: 'Airline configures iAPI messaging against DCS; review against message spec (Integrate iAPI via ARINC / Direct Network).' },
        { id: 'step-3', order: 3, title: 'Certificate', description: 'Exchange and validate test messages in the certification environment.' },
        { id: 'step-4', order: 4, title: 'Cutover', description: 'Switch to the production endpoint and monitor for 2 weeks.' },
      ],
      // The example/reference checklist — stays here unchanged. Duplicating it (via
      // duplicateChecklist in app.js) creates a per-airline copy under that airline's
      // Engagement Page in the Engagement Log, e.g. Thai Airways already has one (see
      // SEED_AIRLINES above) as a demo of what a duplicated-and-in-progress copy looks like.
      checklists: [
        { id: 'chk-1', name: 'Standard iAPI Engagement Checklist', items: IAPI_STANDARD_CHECKLIST_ITEMS },
        { id: 'chk-host-th-iapi', name: 'Standard Host Connectivity Checklist', items: HOST_CONNECTIVITY_CHECKLIST_ITEMS },
      ],
      faqs: [
        { id: 'faq-1', question: 'What message set does iAPI use for Thailand?', answer: 'UN/EDIFACT PAXLST with CUSRES response, per the national border authority spec.' },
        { id: 'faq-2', question: 'Who approves production cutover?', answer: 'System & Infrastructure sign-off plus airline confirmation via email.' },
      ],
      others: [ { id: 'oth-1', note: 'Airline requested Thai-language contact for their local station manager.' } ],
      contacts: [
        { id: 'kc-1', name: 'Somchai Deepan', role: 'IT Manager', org: 'Thai Airways', phone: '+66 2 300 1000', email: 'somchai.d@thaiairways.example' },
        { id: 'kc-2', name: 'Ratana Wong', role: 'Station Manager', org: 'Thai Airways', phone: '+66 2 300 1001', email: 'ratana.w@thaiairways.example' },
      ],
      credentials: [
        { id: 'cred-1', system: 'iAPI Test', type: 'SFTP', host: 'test-iapi.example.com', username: 'thai_test', secret: 'Th@iTest2026', restricted: true },
      ],
    },
    {
      id: 'kmd-th-2', projectId: 'proj-th', dataTypeId: 'dt-pnr', title: 'Passenger Name Record (PNR)',
      documents: [ { id: 'doc-3', name: 'PNR Push Config Sheet.pdf', uploadedAt: '2026-05-15' } ],
      steps: [
        { id: 'step-5', order: 1, title: 'Contact', description: 'Introduce the PNR push requirement and timeline.' },
        { id: 'step-6', order: 2, title: 'Development', description: 'Configure PNR push from the carrier reservation system.' },
        { id: 'step-6b', order: 3, title: 'Certificate', description: 'Validate sample PNR messages against the spec.' },
        { id: 'step-6c', order: 4, title: 'Cutover', description: 'Enable production PNR push and monitor.' },
      ],
      checklists: [
        { id: 'chk-2', name: 'Standard PNR Checklist', items: PNR_TH_CHECKLIST_ITEMS },
        { id: 'chk-host-th-pnr', name: 'Standard Host Connectivity Checklist', items: HOST_CONNECTIVITY_CHECKLIST_ITEMS },
      ],
      faqs: [ { id: 'faq-3', question: 'What is the PNR push frequency requirement?', answer: 'Minimum 3 pushes per flight: at booking, 72h, and 24h before departure.' } ],
      others: [],
      contacts: [ { id: 'kc-3', name: 'Pimchanok Aroon', role: 'Systems Lead', org: 'Bangkok Airways', phone: '+66 2 300 2000', email: 'pimchanok.a@bangkokair.example' } ],
      credentials: [],
    },
    // ---- Laos: iAPI + PNR ----
    {
      id: 'kmd-la-1', projectId: 'proj-la', dataTypeId: 'dt-iapi', title: 'Interactive Advance Passenger Information (iAPI)',
      documents: [ { id: 'doc-4', name: 'iAPI Certification Checklist.pdf', uploadedAt: '2026-02-20' } ],
      steps: [
        { id: 'step-7', order: 1, title: 'Contact', description: 'Send iAPI requirement notice to the airline.' },
        { id: 'step-8', order: 2, title: 'Development', description: 'Configure iAPI messaging via SITA gateway or direct network link.' },
        { id: 'step-8b', order: 3, title: 'Certificate', description: 'Run test batch through the certification environment.' },
        { id: 'step-8c', order: 4, title: 'Cutover', description: 'Agree production cutover window with airline ops.' },
      ],
      checklists: [
        { id: 'chk-3', name: 'Standard iAPI Checklist', items: IAPI_LA_CHECKLIST_ITEMS },
      ],
      faqs: [ { id: 'faq-4', question: 'Which gateway does Laos use for iAPI?', answer: 'SITA GG for carriers without a direct connection; direct network link otherwise.' } ],
      others: [ { id: 'oth-2', note: 'Vietnam Airlines checklist duplicated from the standard template for consistency.' } ],
      contacts: [
        { id: 'kc-4', name: 'Bounmy Souvanh', role: 'IT Coordinator', org: 'Lao Airlines', phone: '+856 21 400 100', email: 'bounmy.s@laoairlines.example' },
        { id: 'kc-5', name: 'Nguyen Van Minh', role: 'Systems Analyst', org: 'Vietnam Airlines', phone: '+84 24 500 200', email: 'minh.nv@vietnamairlines.example' },
      ],
      credentials: [ { id: 'cred-2', system: 'iAPI Production', type: 'Host', host: 'iapi.laopdr.example', username: 'lao_prod', secret: 'L@oProd2026', restricted: true } ],
    },
    {
      id: 'kmd-la-2', projectId: 'proj-la', dataTypeId: 'dt-pnr', title: 'Passenger Name Record (PNR)',
      documents: [],
      steps: [ { id: 'step-9', order: 1, title: 'Contact', description: 'Introduce PNR requirement to the airline.' } ],
      checklists: [],
      faqs: [],
      others: [],
      contacts: [ { id: 'kc-5b', name: 'Somsak Vong', role: 'Network Engineer', org: 'Direct Network Link', phone: '+856 21 500 200', email: 'somsak.v@dnl.example' } ],
      credentials: [],
    },
    // ---- PNG: iAPI + PNR ----
    {
      id: 'kmd-pg-1', projectId: 'proj-pg', dataTypeId: 'dt-iapi', title: 'Interactive Advance Passenger Information (iAPI)',
      documents: [ { id: 'doc-5', name: 'PNG Border Message Spec.pdf', uploadedAt: '2026-01-18' } ],
      steps: [
        { id: 'step-10', order: 1, title: 'Contact', description: 'Onboarding meeting with airline IT.' },
        { id: 'step-11', order: 2, title: 'Development', description: 'Build iAPI interface in parallel with PNR.' },
      ],
      checklists: [ { id: 'chk-5', name: 'Standard iAPI Checklist', items: IAPI_PG_CHECKLIST_ITEMS } ],
      faqs: [ { id: 'faq-5', question: 'Does PNG require both iAPI and PNR?', answer: 'Yes — iAPI for pre-departure clearance, PNR for post-booking record checks.' } ],
      others: [],
      contacts: [ { id: 'kc-6', name: 'James Kaupa', role: 'IT Manager', org: 'Air Niugini', phone: '+675 327 3000', email: 'james.k@airniugini.example' } ],
      credentials: [],
    },
    {
      id: 'kmd-pg-2', projectId: 'proj-pg', dataTypeId: 'dt-pnr', title: 'Passenger Name Record (PNR)',
      documents: [],
      steps: [ { id: 'step-12', order: 1, title: 'Contact', description: 'Send PNR requirement pack.' } ],
      checklists: [],
      faqs: [],
      others: [ { id: 'oth-3', note: 'PNG Air is a smaller domestic/regional carrier; lower priority than Air Niugini.' } ],
      contacts: [ { id: 'kc-7', name: 'Grace Waigani', role: 'Operations Officer', org: 'PNG Air', phone: '+675 325 1444', email: 'grace.w@pngair.example' } ],
      credentials: [],
    },
    // ---- Liberia: iAPI + PNR ----
    {
      id: 'kmd-lr-1', projectId: 'proj-lr', dataTypeId: 'dt-iapi', title: 'Interactive Advance Passenger Information (iAPI)',
      documents: [ { id: 'doc-6', name: 'Liberia e-Border Onboarding Pack.pdf', uploadedAt: '2026-06-01' } ],
      steps: [ { id: 'step-13', order: 1, title: 'Contact', description: 'Introduce Liberia e-Border program and timeline.' } ],
      checklists: [ { id: 'chk-6', name: 'Standard iAPI Checklist', items: IAPI_LR_CHECKLIST_ITEMS } ],
      faqs: [],
      others: [],
      contacts: [ { id: 'kc-8', name: 'Kwame Owusu', role: 'IT Lead', org: 'ASKY Airlines', phone: '+228 22 000 100', email: 'kwame.o@asky.example' } ],
      credentials: [],
    },
    {
      id: 'kmd-lr-2', projectId: 'proj-lr', dataTypeId: 'dt-pnr', title: 'Passenger Name Record (PNR)',
      documents: [],
      steps: [],
      checklists: [],
      faqs: [ { id: 'faq-6', question: 'When does Liberia mandate PNR?', answer: 'Phase 2 of the program, following iAPI stabilisation.' } ],
      others: [],
      contacts: [ { id: 'kc-9', name: 'Achieng Otieno', role: 'Systems Analyst', org: 'Kenya Airways', phone: '+254 20 600 200', email: 'achieng.o@kenya-airways.example' } ],
      credentials: [],
    },
  ],

  // ---------------- Engagement Log: Airlines / Hosts / Links ----------------
  airlines: SEED_AIRLINES,
  hosts: SEED_HOSTS,

  // airline <-> host link, NOT 1:1. route_direction: inbound/outbound/both
  airlineHostLinks: [
    { id: 'ahl-1', projectId: 'proj-th', airlineId: 'al-th-1', hostId: 'host-th-1', routeDirection: 'both' },
    { id: 'ahl-2', projectId: 'proj-th', airlineId: 'al-th-2', hostId: 'host-th-2', routeDirection: 'both' },
    // Nok Air: different host inbound vs outbound -> two rows
    { id: 'ahl-3', projectId: 'proj-th', airlineId: 'al-th-3', hostId: 'host-th-1', routeDirection: 'inbound' },
    { id: 'ahl-4', projectId: 'proj-th', airlineId: 'al-th-3', hostId: 'host-th-2', routeDirection: 'outbound' },

    { id: 'ahl-5', projectId: 'proj-la', airlineId: 'al-la-1', hostId: 'host-la-1', routeDirection: 'both' },
    { id: 'ahl-6', projectId: 'proj-la', airlineId: 'al-la-2', hostId: 'host-la-2', routeDirection: 'both' },
    { id: 'ahl-7', projectId: 'proj-la', airlineId: 'al-la-3', hostId: 'host-la-1', routeDirection: 'both' },

    { id: 'ahl-8', projectId: 'proj-pg', airlineId: 'al-pg-1', hostId: 'host-pg-1', routeDirection: 'both' },
    { id: 'ahl-9', projectId: 'proj-pg', airlineId: 'al-pg-2', hostId: 'host-pg-1', routeDirection: 'both' },
    { id: 'ahl-10', projectId: 'proj-pg', airlineId: 'al-pg-3', hostId: 'host-pg-2', routeDirection: 'both' },

    { id: 'ahl-11', projectId: 'proj-lr', airlineId: 'al-lr-1', hostId: 'host-lr-1', routeDirection: 'both' },
    { id: 'ahl-12', projectId: 'proj-lr', airlineId: 'al-lr-2', hostId: 'host-lr-2', routeDirection: 'both' },
    { id: 'ahl-13', projectId: 'proj-lr', airlineId: 'al-lr-3', hostId: 'host-lr-1', routeDirection: 'both' },
  ],

  // one row per project + (airline_id XOR host_id) + data_type
  engagementRecords: (function build() {
    const rows = [];
    let n = 1;
    const airlineStatusPattern = ['certified', 'testing', 'in_development', 'not_started', 'cutover', 'contacted', 'on_hold', 'certified'];
    const hostStatusPattern = ['certified', 'certified', 'testing', 'in_development'];
    const dataTypeIds = ['dt-app', 'dt-iapi', 'dt-pnr', 'dt-paxlst'];
    const paxByAirline = { 'al-th-1': 1200000, 'al-th-2': 450000, 'al-th-3': 300000,
      'al-la-1': 180000, 'al-la-2': 220000, 'al-la-3': 60000,
      'al-pg-1': 400000, 'al-pg-2': 90000, 'al-pg-3': 260000,
      'al-lr-1': 70000, 'al-lr-2': 85000, 'al-lr-3': 20000 };

    const airlinesByProject = {};
    const hostsByProject = {};
    SEED_AIRLINES.forEach(a => { (airlinesByProject[a.projectId] ||= []).push(a); });
    SEED_HOSTS.forEach(h => { (hostsByProject[h.projectId] ||= []).push(h); });

    let idx = 0;
    Object.keys(airlinesByProject).forEach(projectId => {
      airlinesByProject[projectId].forEach(airline => {
        dataTypeIds.forEach((dtId, dtIdx) => {
          const statusId = airlineStatusPattern[(idx + dtIdx) % airlineStatusPattern.length];
          rows.push({
            id: `er-${n++}`, projectId, airlineId: airline.id, hostId: null, dataTypeId: dtId,
            statusId, pax: paxByAirline[airline.id] || 0,
            lastUpdated: `2026-0${((idx + dtIdx) % 6) + 1}-${String(((idx * 3 + dtIdx) % 27) + 1).padStart(2, '0')}`,
          });
        });
        idx++;
      });
    });
    idx = 0;
    Object.keys(hostsByProject).forEach(projectId => {
      hostsByProject[projectId].forEach(host => {
        dataTypeIds.forEach((dtId, dtIdx) => {
          const statusId = hostStatusPattern[(idx + dtIdx) % hostStatusPattern.length];
          rows.push({
            id: `er-${n++}`, projectId, airlineId: null, hostId: host.id, dataTypeId: dtId,
            statusId, pax: 0,
            lastUpdated: `2026-0${((idx + dtIdx) % 6) + 1}-${String(((idx * 5 + dtIdx) % 27) + 1).padStart(2, '0')}`,
          });
        });
        idx++;
      });
    });
    return rows;
  })(),

  reportConfigs: [
    { id: 'rc-th', projectId: 'proj-th', reportingPeriodTotalPax: 2200000, effectiveFrom: '2026-01-01', effectiveTo: null },
    { id: 'rc-la', projectId: 'proj-la', reportingPeriodTotalPax: 500000, effectiveFrom: '2026-01-01', effectiveTo: null },
    { id: 'rc-pg', projectId: 'proj-pg', reportingPeriodTotalPax: 800000, effectiveFrom: '2026-01-01', effectiveTo: null },
    { id: 'rc-lr', projectId: 'proj-lr', reportingPeriodTotalPax: 200000, effectiveFrom: '2026-01-01', effectiveTo: null },
  ],

  // Global, shared across every project/country — keyed by data type instead of project, so
  // editing e.g. "iAPI Initial Contact Email" once updates it everywhere iAPI is engaged.
  // dataTypeId: null means the template applies generically (used by follow-ups).
  // conditions/keywords/description/subject mirror email-template-library.html's fields —
  // conditions gate when a template applies, keywords back the Template Configuration search.
  coordinationTemplates: [
    {
      id: 'tpl-app-email', dataTypeId: 'dt-app', channel: 'email', category: 'engagement', step: 'Contact', name: 'APP Initial Contact Email',
      description: 'First outreach to an airline to begin APP certification.',
      subject: '[APP] Certification Kickoff — {{airline_name}}',
      body: 'Dear {{airline_contact}},\n\nWe are reaching out to begin the Advance Passenger Processing (APP) certification process for {{airline_name}}...\n\nBest regards,\nCarrier Engagement Team',
      conditions: [{ key: 'Airline contact confirmed', value: 'yes' }],
      keywords: ['app', 'contact', 'kickoff'],
    },
    {
      id: 'tpl-app-zulip', dataTypeId: 'dt-app', channel: 'zulip', category: 'engagement', step: 'Contact', name: 'APP Internal Kickoff Notice',
      description: 'Internal team notice when APP engagement starts with a new airline.',
      subject: null,
      body: '#carrier-engagement > {{project_name}}\nStarting APP engagement with **{{airline_name}}**. Owner: @{{owner}}.',
      conditions: [],
      keywords: ['app', 'internal', 'kickoff'],
    },
    {
      id: 'tpl-iapi-email', dataTypeId: 'dt-iapi', channel: 'email', category: 'engagement', step: 'Contact', name: 'iAPI Initial Contact Email',
      description: 'First outreach to an airline to begin iAPI certification.',
      subject: '[iAPI] Certification Kickoff — {{airline_name}}',
      body: 'Dear {{airline_contact}},\n\nWe are reaching out to begin the Interactive API (iAPI) certification process for {{airline_name}}...\n\nBest regards,\nCarrier Engagement Team',
      conditions: [{ key: 'Airline contact confirmed', value: 'yes' }],
      keywords: ['iapi', 'contact', 'kickoff'],
    },
    {
      id: 'tpl-iapi-zulip', dataTypeId: 'dt-iapi', channel: 'zulip', category: 'engagement', step: 'Contact', name: 'iAPI Internal Kickoff Notice',
      description: 'Internal team notice when iAPI engagement starts with a new airline.',
      subject: null,
      body: '#carrier-engagement > {{project_name}}\nStarting iAPI engagement with **{{airline_name}}**. Owner: @{{owner}}.',
      conditions: [],
      keywords: ['iapi', 'internal', 'kickoff'],
    },
    {
      id: 'tpl-pnr-email', dataTypeId: 'dt-pnr', channel: 'email', category: 'engagement', step: 'Contact', name: 'PNR Initial Contact Email',
      description: 'First outreach to an airline to begin PNR certification.',
      subject: '[PNR] Certification Kickoff — {{airline_name}}',
      body: 'Dear {{airline_contact}},\n\nWe are reaching out to begin the Passenger Name Record (PNR) certification process for {{airline_name}}...\n\nBest regards,\nCarrier Engagement Team',
      conditions: [{ key: 'Airline contact confirmed', value: 'yes' }],
      keywords: ['pnr', 'contact', 'kickoff'],
    },
    {
      id: 'tpl-pnr-zulip', dataTypeId: 'dt-pnr', channel: 'zulip', category: 'engagement', step: 'Contact', name: 'PNR Internal Kickoff Notice',
      description: 'Internal team notice when PNR engagement starts with a new airline.',
      subject: null,
      body: '#carrier-engagement > {{project_name}}\nStarting PNR engagement with **{{airline_name}}**. Owner: @{{owner}}.',
      conditions: [],
      keywords: ['pnr', 'internal', 'kickoff'],
    },
    {
      id: 'tpl-followup-1', dataTypeId: null, channel: null, category: 'followup', step: null, name: 'Standard Follow-Up',
      description: 'Generic follow-up when an airline has gone quiet on any data type.',
      subject: 'Follow-up: {{data_type}} certification status',
      body: 'Hi {{airline_contact}}, following up on {{data_type}} certification — could you share an update on current status and any blockers?',
      conditions: [{ key: 'No response for 5+ business days', value: 'yes' }],
      keywords: ['followup', 'reminder', 'status'],
    },
  ],

  auditLog: [
    { id: 'al-log-1', timestamp: '2026-07-01T09:12:00', username: 'admin', action: 'Login', details: 'Successful login' },
    { id: 'al-log-2', timestamp: '2026-07-02T11:04:00', username: 'admin', action: 'Create User', details: 'Created user "member"' },
    { id: 'al-log-3', timestamp: '2026-07-03T14:31:00', username: 'member', action: 'KM Passcode Verified', details: 'Unlocked KM edit for session' },
    { id: 'al-log-4', timestamp: '2026-07-05T08:45:00', username: 'member', action: 'Update Engagement Status', details: 'Thai Airways / iAPI -> certified' },
  ],

  userThemePrefs: {
    admin: { mode: 'dark', accent: '#2f81f7' },
    member: { mode: 'light', accent: '#0969da' },
    viewer: { mode: 'dim', accent: '#a371f7' },
  },

  oneTimeCodes: [], // { id, purpose: 'password_reset'|'km_passcode', username, code, expiresAt }
};
