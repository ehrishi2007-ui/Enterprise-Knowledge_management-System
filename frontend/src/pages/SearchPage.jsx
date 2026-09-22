import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Filter, X, FileText, MessageSquare } from 'lucide-react';
import { Button, Card, Badge, TabSwitcher, EmptyState, LoadingSpinner } from '../components/ui';
import api from '../lib/api';
import { DEPARTMENTS, DEPT_COLORS } from '../lib/constants';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState('semantic'); // semantic or keyword
  const [department, setDepartment] = useState('');
  
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q, searchType, department);
    }
  }, []);

  const performSearch = async (q, type, dept) => {
    if (!q.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get('/search/', {
        params: {
          q,
          search_type: type,
          department: dept || undefined,
          limit: 20
        }
      });
      setResults(res.data.results || []);
      setTotalCount(res.data.total_count || 0);
      
      // Update URL
      const params = new URLSearchParams();
      params.set('q', q);
      setSearchParams(params);
    } catch (err) {
      console.error('Search failed', err);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(query, searchType, department);
  };

  const clearFilters = () => {
    setSearchType('semantic');
    setDepartment('');
    if (query) {
      performSearch(query, 'semantic', '');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-6">Document Search</h1>
        
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for policies, guidelines, forms..."
              className="w-full bg-slate-800 border-2 border-slate-700 focus:border-orange-500 rounded-xl py-3 pl-12 pr-4 text-slate-50 outline-none transition-colors"
            />
            <Button 
              type="submit" 
              className="absolute right-2 top-2 px-6"
              disabled={loading || !query.trim()}
            >
              Search
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Type:</span>
              <TabSwitcher 
                tabs={[
                  { id: 'semantic', label: 'Semantic (AI)' },
                  { id: 'keyword', label: 'Keyword (Exact)' }
                ]}
                activeTab={searchType}
                onChange={(tabId) => {
                  setSearchType(tabId);
                  if (hasSearched) performSearch(query, tabId, department);
                }}
              />
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-slate-400">Department:</span>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  if (hasSearched) performSearch(query, searchType, e.target.value);
                }}
                className="bg-slate-900 border border-slate-700 rounded text-sm px-3 py-1.5 focus:outline-none focus:border-orange-500"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            {(searchType !== 'semantic' || department !== '') && (
              <button 
                type="button"
                onClick={clearFilters}
                className="ml-auto text-xs text-slate-400 hover:text-orange-500 flex items-center gap-1"
              >
                <X size={12} /> Clear Filters
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : !hasSearched ? (
          <EmptyState 
            icon={<SearchIcon className="w-12 h-12 text-slate-500" />}
            title="Search the Knowledge Base"
            description="Enter keywords or a question above to find relevant company documents."
          />
        ) : results.length === 0 ? (
          <EmptyState 
            icon={<FileText className="w-12 h-12 text-slate-500" />}
            title="No results found"
            description="We couldn't find any documents matching your search. Try different keywords or switch search types."
          />
        ) : (
          <div>
            <div className="text-sm text-slate-400 mb-4">
              Found {totalCount} result{totalCount !== 1 ? 's' : ''} for "{query}"
            </div>
            <div className="grid gap-4">
              {results.map((result, idx) => (
                <Card key={idx} className="p-5 hover:border-orange-500/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-slate-900 p-2 rounded-lg text-orange-500">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100">{result.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            {result.department && (
                              <Badge color={DEPT_COLORS[result.department] || 'gray'}>
                                {result.department}
                              </Badge>
                            )}
                            {result.tags && result.tags.map(tag => (
                              <Badge key={tag} variant="outline" color="gray">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/50 p-4 rounded text-sm text-slate-300 font-mono whitespace-pre-wrap">
                        {result.snippet}
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col items-center gap-3 min-w-[140px]">
                      {result.score && (
                        <div className="w-full text-right md:text-center text-xs text-slate-400 mb-2">
                          Relevance: {Math.round(result.score * 100)}%
                        </div>
                      )}
                      <Button 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => navigate(`/employee/chat?q=${encodeURIComponent('Tell me about ' + result.title)}`)}
                      >
                        <MessageSquare size={16} /> Ask AI
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => window.open(`/api/documents/${result.id}/download`, '_blank')}
                      >
                        <FileText size={16} /> View Doc
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
