import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Filter, X, FileText, Bot, Sparkles, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { Button, Card, Badge, TabSwitcher, EmptyState, LoadingSpinner } from '../components/ui';
import api from '../lib/api';
import { useDepartments } from '../hooks/useDepartments';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { departments, getDeptColor } = useDepartments();
  
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
          q: q.trim(),
          search_type: type,
          department: dept || undefined,
          limit: 20
        }
      });
      setResults(res.data.results || []);
      setTotalCount(res.data.total_count || 0);
      
      const params = new URLSearchParams();
      params.set('q', q.trim());
      setSearchParams(params);
    } catch (err) {
      console.error('Search error', err);
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
    if (query.trim()) {
      performSearch(query, 'semantic', '');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Main Search Box */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Repository Search</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Search across vectorized pages using semantic meaning or exact keyword matching.
          </p>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-3.5 text-[var(--color-text-secondary)] w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by topic, keyword, or natural question (e.g. grading scheme, syllabus, procurement)..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-teal focus:ring-2 focus:ring-teal/30 rounded-xl py-3.5 pl-12 pr-28 text-sm text-[var(--color-text)] outline-none transition-all shadow-sm"
            />
            <Button 
              type="submit" 
              variant="primary"
              className="absolute right-2 top-2 px-5 py-1.5 text-xs shadow-sm"
              disabled={loading || !query.trim()}
            >
              Search
            </Button>
          </div>
          
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)] font-medium">
                <SlidersHorizontal size={14} />
                <span>Search Mode:</span>
              </div>
              
              <TabSwitcher 
                tabs={[
                  { value: 'semantic', label: 'Semantic (AI Vector)' },
                  { value: 'keyword', label: 'Keyword (Exact Match)' }
                ]}
                activeTab={searchType}
                onChange={(tabId) => {
                  setSearchType(tabId);
                  if (hasSearched) performSearch(query, tabId, department);
                }}
              />
              
              <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-3">
                <span className="text-[var(--color-text-secondary)]">Department:</span>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    if (hasSearched) performSearch(query, searchType, e.target.value);
                  }}
                  className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {(searchType !== 'semantic' || department !== '') && (
              <button 
                type="button"
                onClick={clearFilters}
                className="text-xs text-[var(--color-text-secondary)] hover:text-teal flex items-center gap-1 transition-colors"
              >
                <X size={13} /> Clear Filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Container */}
      <div className="space-y-4">
        {loading ? (
          <LoadingSpinner size="md" message="Scanning document index..." />
        ) : !hasSearched ? (
          <EmptyState 
            icon={SearchIcon}
            title="Search the Knowledge Base"
            description="Enter a query above to retrieve relevant passages and policies across all departments."
          />
        ) : results.length === 0 ? (
          <EmptyState 
            icon={FileText}
            title="No Matching Passages Found"
            description="Try changing your search mode to Keyword or searching with broader terms."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] px-1">
              <span>
                Found <strong className="text-[var(--color-text)]">{totalCount}</strong> relevant passage{totalCount !== 1 ? 's' : ''} for "{query}"
              </span>
              <span className="uppercase text-[10px] font-semibold text-teal">
                Mode: {searchType}
              </span>
            </div>

            <div className="grid gap-3.5">
              {results.map((result, idx) => (
                <Card key={idx} hover className="transition-all">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-teal/10 text-teal shrink-0 mt-0.5">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--color-text)]">
                            {result.title || result.filename || 'Untitled Document'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {result.department && (
                              <Badge.Custom bgColor={getDeptColor(result.department)}>
                                {result.department}
                              </Badge.Custom>
                            )}
                            {result.page_number && (
                              <Badge color="gray" size="sm">
                                Page {result.page_number}
                              </Badge>
                            )}
                            {result.tags && result.tags.map(tag => (
                              <Badge key={tag} color="teal" size="sm">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Snippet preview */}
                      {result.snippet && (
                        <div className="bg-[var(--color-surface-alt)] p-3 rounded-lg text-xs text-[var(--color-text)] font-mono leading-relaxed border border-[var(--color-border)] whitespace-pre-wrap">
                          {result.snippet}
                        </div>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-row md:flex-col items-center gap-2 md:min-w-[150px] shrink-0">
                      {result.score !== undefined && (
                        <div className="w-full text-right md:text-center text-[11px] text-[var(--color-text-secondary)] mb-1">
                          Relevance: <strong className="text-teal">{Math.round((result.score || 1) * 100)}%</strong>
                        </div>
                      )}
                      <Button 
                        size="sm"
                        variant="primary"
                        className="w-full text-xs"
                        icon={Bot}
                        onClick={() => navigate(`/employee/chat?q=${encodeURIComponent('Tell me about ' + (result.title || query))}`)}
                      >
                        Ask AI About This
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
