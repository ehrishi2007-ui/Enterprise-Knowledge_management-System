import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Card, Badge, EmptyState, LoadingSpinner, Button } from '../components/ui';
import { DEPARTMENTS, DEPT_COLORS } from '../lib/constants';
import { Building2, Users, FileText, Mail, Calendar, Shield } from 'lucide-react';

export default function DepartmentDetailsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDept = searchParams.get('dept') || DEPARTMENTS[0];

  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDepartmentData = async (dept) => {
    try {
      setLoading(true);
      setError('');
      const [usersRes, docsRes] = await Promise.all([
        api.get('/users/', { params: { department: dept } }),
        api.get('/documents/', { params: { department: dept, limit: 50 } })
      ]);

      const uList = usersRes.data?.users || usersRes.data || [];
      const dList = Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.documents || [];

      setUsers(uList);
      setDocuments(dList);
    } catch (err) {
      console.error('Error fetching department data:', err);
      setError('Failed to load department details from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentData(selectedDept);
  }, [selectedDept]);

  const handleSelectDept = (dept) => {
    setSearchParams({ dept });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-3">
            <Building2 className="text-orange-500" size={28} />
            <span>Department Intelligence</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time breakdown of team members, role distribution, and authorized institutional documents.
          </p>
        </div>

        {/* Department Switcher Pills */}
        <div className="flex flex-wrap gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          {DEPARTMENTS.map((dept) => {
            const isActive = selectedDept === dept;
            return (
              <button
                key={dept}
                onClick={() => handleSelectDept(dept)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {dept}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <LoadingSpinner text={`Fetching data for ${selectedDept} Department...`} />
        </Card>
      ) : error ? (
        <Card className="p-6 text-center border-red-500/30">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchDepartmentData(selectedDept)}>
            Retry
          </Button>
        </Card>
      ) : (
        <>
          {/* Department Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-lg"
                style={{ backgroundColor: DEPT_COLORS[selectedDept] || '#f97316' }}
              >
                {selectedDept.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Department</p>
                <h3 className="text-xl font-bold text-slate-100">{selectedDept}</h3>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Registered Users</p>
                <h3 className="text-xl font-bold text-slate-100">{users.length}</h3>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Indexed Documents</p>
                <h3 className="text-xl font-bold text-slate-100">{documents.length}</h3>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Department Users Table */}
            <div className="lg:col-span-7">
              <Card title={`${selectedDept} Team Members (${users.length})`} icon={Users} className="p-0">
                {users.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Users}
                      title="No members assigned"
                      message={`No user profiles are registered under ${selectedDept} currently.`}
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-850 text-slate-400 text-xs font-semibold border-b border-slate-700">
                        <tr>
                          <th className="p-3 pl-4">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Role</th>
                          <th className="p-3 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-slate-200">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="p-3 pl-4 font-medium text-slate-100">{u.display_name}</td>
                            <td className="p-3 text-slate-400 text-xs font-mono">{u.email}</td>
                            <td className="p-3">
                              <Badge variant={u.role === 'admin' ? 'accent' : 'info'}>
                                {u.role}
                              </Badge>
                            </td>
                            <td className="p-3 pr-4">
                              <span className={`text-xs font-medium ${u.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Department Documents List */}
            <div className="lg:col-span-5">
              <Card title={`${selectedDept} Documents (${documents.length})`} icon={FileText} className="p-4 space-y-3">
                {documents.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No documents"
                    message={`No knowledge documents have been uploaded for ${selectedDept}.`}
                  />
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-slate-900/60 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-200 leading-snug line-clamp-1">
                            {doc.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                            {doc.file_type || 'PDF'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {doc.tags?.slice(0, 3).map((t, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                        {doc.created_at && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                            <Calendar size={12} />
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
