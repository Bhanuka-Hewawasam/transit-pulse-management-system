import React from 'react';

const Documentation: React.FC = () => (
  <div className="space-y-5">
    <div><h2 className="text-2xl font-bold text-gray-900">Project Documentation</h2><p className="mt-1 text-sm text-gray-500">SmartMove Transport Solutions coursework reference.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Project overview</h3><p className="mt-2 text-sm text-gray-600">SmartMove is a beginner-friendly transport management dashboard for fleet operations, passenger services, scheduling, bookings, payments, maintenance, and feedback.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Main modules</h3><p className="mt-2 text-sm text-gray-600">Vehicles, Drivers, Routes, Passengers, Trips, Bookings, Payments, Maintenance, Feedback, Reports, MongoDB Content, and this documentation page.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Database details</h3><p className="mt-2 text-sm text-gray-600">Oracle scripts model transactional entities with constraints, sequences, views, sample data, PL/SQL procedures, functions, cursors, triggers, exceptions, and reports.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Five reports</h3><p className="mt-2 text-sm text-gray-600">Most frequently used routes; total revenue by period; passenger travel history; vehicles due for maintenance; and driver performance.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">MongoDB integration status</h3><p className="mt-2 text-sm text-gray-600">Not connected to a live server. The page uses labelled demo content, while `database/mongodb` contains collections, sample data, queries, and setup notes.</p></section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">Group responsibilities</h3><p className="mt-2 text-sm text-gray-600">Assign final member names in `docs/member-contributions.md` across UI, Oracle/PLSQL, MongoDB, reports, testing, and documentation.</p></section>
    </div>
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-gray-900">How to run</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600"><li>Run <code>npm install</code>.</li><li>Run <code>npm run dev</code> and open the displayed local URL.</li><li>Use <code>npm run build</code> for a production build and <code>npm run lint</code> for lint checks.</li><li>Run Oracle scripts in order when an Oracle environment is available; MongoDB scripts are optional.</li></ol></section>
  </div>
);
export default Documentation;
