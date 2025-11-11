// src/lib/seed-data.ts
// Script to populate Firebase with dummy data for testing DC Request System

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import type { RequestTicket, RequestCategory, RequestPriority, TicketStatus, ApprovalStage } from '@/types';

// Helper to create timestamps
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return Timestamp.fromDate(date);
};

const hoursAgo = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return Timestamp.fromDate(date);
};

// Dummy DCs from different states
const DCS = [
  { id: 'DC001', name: 'Mumbai Central DC', code: 'MUM-01', state: 'Maharashtra' },
  { id: 'DC002', name: 'Pune East DC', code: 'PUN-02', state: 'Maharashtra' },
  { id: 'DC003', name: 'Bangalore North DC', code: 'BLR-03', state: 'Karnataka' },
  { id: 'DC004', name: 'Mysore DC', code: 'MYS-04', state: 'Karnataka' },
  { id: 'DC005', name: 'Chennai South DC', code: 'CHN-05', state: 'Tamil Nadu' },
  { id: 'DC006', name: 'Ahmedabad DC', code: 'AMD-06', state: 'Gujarat' },
  { id: 'DC007', name: 'Jaipur DC', code: 'JAI-07', state: 'Rajasthan' },
  { id: 'DC008', name: 'Lucknow DC', code: 'LKO-08', state: 'Uttar Pradesh' },
];

// Sample request items
const EQUIPMENT_ITEMS = [
  { name: 'Blood Pressure Monitor', unit: 'piece', specs: 'Digital, automatic' },
  { name: 'Glucometer', unit: 'piece', specs: 'With 100 test strips' },
  { name: 'Thermometer', unit: 'piece', specs: 'Digital, contactless' },
  { name: 'Stethoscope', unit: 'piece', specs: 'Dual head' },
  { name: 'Pulse Oximeter', unit: 'piece', specs: 'Finger type with display' },
];

const SUPPLY_ITEMS = [
  { name: 'Surgical Gloves', unit: 'box', specs: 'Size M, latex-free, 100 pieces' },
  { name: 'Syringes', unit: 'box', specs: '5ml, disposable, 100 pieces' },
  { name: 'Cotton Rolls', unit: 'kg', specs: 'Medical grade, sterilized' },
  { name: 'Bandages', unit: 'roll', specs: 'Elastic, 4 inch width' },
  { name: 'Alcohol Swabs', unit: 'box', specs: 'Sterile, 200 pieces' },
];

const MAINTENANCE_ITEMS = [
  { name: 'AC Repair', unit: 'service', specs: 'Gas filling and general servicing' },
  { name: 'Electrical Work', unit: 'service', specs: 'Wiring and switch replacement' },
  { name: 'Plumbing Repair', unit: 'service', specs: 'Pipe leak fixing' },
  { name: 'Furniture Repair', unit: 'service', specs: 'Chair and table fixing' },
];

const INFRASTRUCTURE_ITEMS = [
  { name: 'Ceiling Fan', unit: 'piece', specs: '48 inch, high speed' },
  { name: 'LED Lights', unit: 'piece', specs: '20W, white light' },
  { name: 'Office Desk', unit: 'piece', specs: '4ft x 2ft, wooden' },
  { name: 'Storage Cabinet', unit: 'piece', specs: '6ft height, steel' },
];

// Generate dummy requests
const generateDummyRequests = (): Partial<RequestTicket>[] => {
  const requests: Partial<RequestTicket>[] = [];
  let requestCounter = 1;

  // Helper to create a request
  const createRequest = (
    dc: typeof DCS[0],
    category: RequestCategory,
    priority: RequestPriority,
    status: TicketStatus,
    currentStage: ApprovalStage,
    daysOld: number,
    items: any[]
  ): Partial<RequestTicket> => {
    const id = `REQ-2025-${String(requestCounter++).padStart(4, '0')}`;
    const createdAt = daysAgo(daysOld);

    const categoryTitles = {
      'Equipment': 'Medical Equipment Request',
      'Supplies': 'Medical Supplies Replenishment',
      'Maintenance': 'Facility Maintenance Required',
      'Infrastructure': 'Infrastructure Upgrade',
      'Other': 'Miscellaneous Request'
    };

    const categoryDescriptions = {
      'Equipment': `We need to procure medical equipment for better patient care at ${dc.name}. Current equipment is outdated and needs replacement.`,
      'Supplies': `Regular medical supplies are running low at ${dc.name}. We need immediate replenishment to maintain service quality.`,
      'Maintenance': `Facility maintenance is required at ${dc.name} to ensure smooth operations and patient comfort.`,
      'Infrastructure': `Infrastructure improvements needed at ${dc.name} to enhance operational efficiency.`,
      'Other': `General request for ${dc.name} to improve service delivery.`
    };

    const requestItems = items.map(item => ({
      itemName: item.name,
      quantity: Math.floor(Math.random() * 10) + 1,
      unit: item.unit,
      estimatedPrice: Math.floor(Math.random() * 5000) + 500,
      specifications: item.specs,
    }));

    const totalCost = requestItems.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);

    // Create history based on status
    const history: any[] = [
      {
        action: 'created',
        performedBy: dc.name,
        performedByRole: 'dc',
        timestamp: createdAt,
        details: 'Request created and submitted for review'
      }
    ];

    // Create approvals based on status
    const approvals: any = {};

    if (['pending_finance_review', 'pending_procurement', 'in_procurement', 'completed'].includes(status)) {
      // Ops approved
      const opsApprovalTime = daysAgo(daysOld - 1);
      approvals.opsManager = {
        approvedBy: `qa_${dc.state === 'Maharashtra' ? 'mh' : dc.state === 'Karnataka' ? 'ka' : 'tn'}`,
        approvedByName: `QA Manager - ${dc.state}`,
        approvedAt: opsApprovalTime,
        status: 'approved',
        comments: 'Request verified. Equipment/supplies are necessary for operations. Forwarding to finance for budget approval.',
      };
      history.push({
        action: 'ops_approved',
        performedBy: approvals.opsManager.approvedByName,
        performedByRole: 'ops_manager',
        timestamp: opsApprovalTime,
        details: 'Approved by Operations Manager'
      });
    }

    if (['pending_procurement', 'in_procurement', 'completed'].includes(status)) {
      // Finance approved
      const financeApprovalTime = daysAgo(Math.max(daysOld - 2, 0));
      approvals.finance = {
        approvedBy: 'finance',
        approvedByName: 'Finance Team',
        approvedAt: financeApprovalTime,
        status: 'approved',
        comments: `Budget approved. Total cost: ₹${totalCost.toLocaleString()}. Proceeding with procurement.`,
      };
      history.push({
        action: 'finance_approved',
        performedBy: 'Finance Team',
        performedByRole: 'finance',
        timestamp: financeApprovalTime,
        details: 'Budget approved by Finance'
      });
    }

    if (['in_procurement', 'completed'].includes(status)) {
      // Procurement started
      const procurementStartTime = daysAgo(Math.max(daysOld - 3, 0));
      approvals.procurement = {
        approvedBy: 'procurement',
        approvedByName: 'Procurement Team',
        approvedAt: procurementStartTime,
        status: status === 'completed' ? 'approved' : 'pending',
        comments: status === 'completed'
          ? 'Order placed with vendor. Items delivered successfully.'
          : 'Order placed with vendor. Delivery in progress.',
      };
      history.push({
        action: 'procurement_started',
        performedBy: 'Procurement Team',
        performedByRole: 'procurement',
        timestamp: procurementStartTime,
        details: 'Procurement process initiated'
      });
    }

    if (status === 'completed') {
      const completedTime = hoursAgo(Math.floor(Math.random() * 48));
      history.push({
        action: 'completed',
        performedBy: 'Procurement Team',
        performedByRole: 'procurement',
        timestamp: completedTime,
        details: 'Request fulfilled and marked as completed'
      });
    }

    if (status === 'rejected') {
      const rejectionTime = daysAgo(daysOld - 1);
      const rejector = Math.random() > 0.5 ? 'ops_manager' : 'finance';
      approvals[rejector === 'ops_manager' ? 'opsManager' : 'finance'] = {
        approvedBy: rejector === 'ops_manager' ? `qa_${dc.state.substring(0, 2).toLowerCase()}` : 'finance',
        approvedByName: rejector === 'ops_manager' ? `QA Manager - ${dc.state}` : 'Finance Team',
        approvedAt: rejectionTime,
        status: 'rejected',
        comments: rejector === 'ops_manager'
          ? 'Request does not meet operational requirements. Please revise and resubmit with proper justification.'
          : 'Budget not available for this request in current quarter. Please resubmit in next budget cycle.',
      };
      history.push({
        action: 'rejected',
        performedBy: approvals[rejector === 'ops_manager' ? 'opsManager' : 'finance'].approvedByName,
        performedByRole: rejector,
        timestamp: rejectionTime,
        details: 'Request rejected'
      });
    }

    // Add some comments
    const comments: any[] = [];
    if (daysOld >= 2) {
      comments.push({
        id: `comment-${id}-1`,
        userId: dc.id,
        userName: dc.name,
        userRole: 'dc',
        text: 'This is urgent. Please expedite the approval process.',
        timestamp: daysAgo(daysOld - 1),
        attachments: []
      });
    }

    return {
      id,
      dcId: dc.id,
      dcName: dc.name,
      clinicCode: dc.code,
      stateName: dc.state,
      title: categoryTitles[category],
      description: categoryDescriptions[category],
      category,
      priority,
      items: requestItems,
      status,
      currentStage,
      approvals,
      comments,
      history,
      attachments: [],
      createdAt,
      updatedAt: history[history.length - 1].timestamp,
      ...(status === 'completed' ? { completedAt: history[history.length - 1].timestamp } : {}),
    };
  };

  // Generate requests with different statuses

  // 1. Pending Ops Review (5 requests)
  requests.push(createRequest(DCS[0], 'Equipment', 'High', 'pending_ops_review', 'ops_manager', 1, EQUIPMENT_ITEMS.slice(0, 2)));
  requests.push(createRequest(DCS[1], 'Supplies', 'Urgent', 'pending_ops_review', 'ops_manager', 0, SUPPLY_ITEMS.slice(0, 3)));
  requests.push(createRequest(DCS[2], 'Maintenance', 'Medium', 'pending_ops_review', 'ops_manager', 2, MAINTENANCE_ITEMS.slice(0, 1)));
  requests.push(createRequest(DCS[3], 'Equipment', 'High', 'pending_ops_review', 'ops_manager', 1, EQUIPMENT_ITEMS.slice(2, 4)));
  requests.push(createRequest(DCS[4], 'Infrastructure', 'Low', 'pending_ops_review', 'ops_manager', 3, INFRASTRUCTURE_ITEMS.slice(0, 2)));

  // 2. Pending Finance Review (4 requests)
  requests.push(createRequest(DCS[0], 'Equipment', 'Urgent', 'pending_finance_review', 'finance', 3, EQUIPMENT_ITEMS.slice(0, 3)));
  requests.push(createRequest(DCS[2], 'Supplies', 'High', 'pending_finance_review', 'finance', 4, SUPPLY_ITEMS.slice(0, 4)));
  requests.push(createRequest(DCS[5], 'Infrastructure', 'Medium', 'pending_finance_review', 'finance', 5, INFRASTRUCTURE_ITEMS.slice(0, 3)));
  requests.push(createRequest(DCS[6], 'Equipment', 'High', 'pending_finance_review', 'finance', 4, EQUIPMENT_ITEMS.slice(1, 4)));

  // 3. Pending Procurement (3 requests)
  requests.push(createRequest(DCS[1], 'Equipment', 'High', 'pending_procurement', 'procurement', 6, EQUIPMENT_ITEMS.slice(0, 2)));
  requests.push(createRequest(DCS[3], 'Supplies', 'Medium', 'pending_procurement', 'procurement', 7, SUPPLY_ITEMS.slice(1, 4)));
  requests.push(createRequest(DCS[7], 'Maintenance', 'Urgent', 'pending_procurement', 'procurement', 5, MAINTENANCE_ITEMS.slice(0, 2)));

  // 4. In Procurement (4 requests)
  requests.push(createRequest(DCS[0], 'Supplies', 'High', 'in_procurement', 'procurement', 8, SUPPLY_ITEMS.slice(0, 3)));
  requests.push(createRequest(DCS[2], 'Equipment', 'Medium', 'in_procurement', 'procurement', 9, EQUIPMENT_ITEMS.slice(2, 5)));
  requests.push(createRequest(DCS[4], 'Infrastructure', 'Low', 'in_procurement', 'procurement', 10, INFRASTRUCTURE_ITEMS.slice(1, 3)));
  requests.push(createRequest(DCS[5], 'Supplies', 'High', 'in_procurement', 'procurement', 7, SUPPLY_ITEMS.slice(0, 2)));

  // 5. Completed (6 requests)
  requests.push(createRequest(DCS[0], 'Equipment', 'High', 'completed', 'procurement', 15, EQUIPMENT_ITEMS.slice(0, 2)));
  requests.push(createRequest(DCS[1], 'Supplies', 'Medium', 'completed', 'procurement', 20, SUPPLY_ITEMS.slice(0, 3)));
  requests.push(createRequest(DCS[2], 'Maintenance', 'Low', 'completed', 'procurement', 18, MAINTENANCE_ITEMS.slice(0, 1)));
  requests.push(createRequest(DCS[3], 'Equipment', 'High', 'completed', 'procurement', 12, EQUIPMENT_ITEMS.slice(1, 3)));
  requests.push(createRequest(DCS[4], 'Infrastructure', 'Medium', 'completed', 'procurement', 25, INFRASTRUCTURE_ITEMS.slice(0, 2)));
  requests.push(createRequest(DCS[6], 'Supplies', 'Low', 'completed', 'procurement', 30, SUPPLY_ITEMS.slice(2, 5)));

  // 6. Rejected (3 requests)
  requests.push(createRequest(DCS[1], 'Equipment', 'Low', 'rejected', 'ops_manager', 10, EQUIPMENT_ITEMS.slice(0, 1)));
  requests.push(createRequest(DCS[5], 'Infrastructure', 'Low', 'rejected', 'finance', 14, INFRASTRUCTURE_ITEMS.slice(2, 4)));
  requests.push(createRequest(DCS[7], 'Other', 'Low', 'rejected', 'ops_manager', 8, [{ name: 'Miscellaneous Items', unit: 'lot', specs: 'Various items' }]));

  return requests;
};

// Function to seed the database
export async function seedRequestData() {
  try {
    console.log('🌱 Starting to seed request data...');

    const requests = generateDummyRequests();
    const requestsCollection = collection(db, 'dc_requests');

    let successCount = 0;
    let errorCount = 0;

    for (const request of requests) {
      try {
        await addDoc(requestsCollection, request);
        successCount++;
        console.log(`✅ Created request: ${request.id} - ${request.title}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to create request ${request.id}:`, error);
      }
    }

    console.log('\n🎉 Seeding completed!');
    console.log(`✅ Successfully created: ${successCount} requests`);
    console.log(`❌ Failed: ${errorCount} requests`);
    console.log('\n📊 Summary:');
    console.log(`- Pending Ops Review: 5`);
    console.log(`- Pending Finance Review: 4`);
    console.log(`- Pending Procurement: 3`);
    console.log(`- In Procurement: 4`);
    console.log(`- Completed: 6`);
    console.log(`- Rejected: 3`);
    console.log(`- Total: ${successCount} requests\n`);

    return { success: true, successCount, errorCount };
  } catch (error) {
    console.error('💥 Error seeding data:', error);
    return { success: false, error };
  }
}
