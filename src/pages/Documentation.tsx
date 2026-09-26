import React from 'react';

const Documentation: React.FC = () => (
  <div className="space-y-5">
    <div><h2 className="text-2xl font-bold text-gray-900">Project Documentation</h2><p className="mt-1 text-sm text-gray-500">SmartMove Transport Solutions coursework reference.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Project overview</h3><p className="mt-2 text-sm text-gray-600">SmartMove is a beginner-friendly transport management dashboard for fleet operations, passenger services, scheduling, bookings, payments, maintenance, and feedback.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Main modules</h3><p className="mt-2 text-sm text-gray-600">Vehicles, Drivers, Routes, Passengers, Trips, Bookings, Payments, Maintenance, Feedback, Reports, MongoDB Content, and this documentation page.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Database details</h3><p className="mt-2 text-sm text-gray-600">Set `DATABASE_MODE=oracle` in the backend environment to read and write application records through Oracle. Database sample scripts are separate and are never run automatically.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Reports</h3><p className="mt-2 text-sm text-gray-600">The report views calculate route usage, revenue, passenger history, maintenance due, and driver/vehicle performance from backend entity endpoints. Legacy aggregate report endpoints are still demo-only.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">MongoDB content</h3><p className="mt-2 text-sm text-gray-600">MongoDB is optional. The content page identifies live MongoDB records or an explicitly returned demo fallback; an unavailable MongoDB connection is shown as an error when demo fallback is disabled.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Group responsibilities</h3><p className="mt-2 text-sm text-gray-600">Assign final member names in `docs/member-contributions.md` across UI, Oracle/PLSQL, MongoDB, reports, testing, and documentation.</p></section>
    </div>
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">How to run</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600"><li>Run <code>npm install</code>.</li><li>In separate terminals, run <code>npm run backend</code> and <code>npm run dev</code> from the project root.</li><li>Use <code>npm run build</code>, <code>npm run backend:typecheck</code>, <code>npm run lint</code>, and <code>npm test</code> to validate changes.</li><li>Only run Oracle schema scripts when the required objects are not already present.</li></ol></section>
  </div>
);
export default Documentation;
