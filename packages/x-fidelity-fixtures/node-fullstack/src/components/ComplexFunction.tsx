import React, { useState, useEffect } from 'react';

/**
 * Complex function that should trigger functionComplexity rule
 * This function has high cyclomatic and cognitive complexity
 */
export function ComplexFunction(props: {
  items: any[];
  loading: boolean;
  error: string | null;
  onItemClick: (id: string) => void;
  onItemDelete: (id: string) => void;
  onItemEdit: (id: string, data: any) => void;
  onBulkAction: (action: string, items: string[]) => void;
  filters: Record<string, any>;
  sorting: { field: string; direction: 'asc' | 'desc' };
}) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Complex function with high cyclomatic complexity (>20)
  const processItems = (items: any[], filters: any, sorting: any) => {
    let result = [...items];
    
    // Multiple nested conditions increase complexity
    if (filters) {
      if (filters.category && filters.category !== 'all') {
        if (filters.category === 'electronics') {
          result = result.filter(item => {
            if (item.category === 'electronics') {
              if (filters.subcategory) {
                if (filters.subcategory === 'phones') {
                  return item.subcategory === 'phones' && item.price > 100;
                } else if (filters.subcategory === 'laptops') {
                  return item.subcategory === 'laptops' && item.price > 500;
                } else if (filters.subcategory === 'tablets') {
                  return item.subcategory === 'tablets' && item.price > 200;
                } else {
                  return item.subcategory === filters.subcategory;
                }
              }
              return true;
            }
            return false;
          });
        } else if (filters.category === 'clothing') {
          result = result.filter(item => {
            if (item.category === 'clothing') {
              if (filters.size) {
                if (filters.size === 'small') {
                  return item.size === 'small' || item.size === 'xs';
                } else if (filters.size === 'medium') {
                  return item.size === 'medium' || item.size === 'm';
                } else if (filters.size === 'large') {
                  return item.size === 'large' || item.size === 'xl';
                } else {
                  return item.size === filters.size;
                }
              }
              if (filters.color) {
                if (filters.color === 'dark') {
                  return item.color === 'black' || item.color === 'navy' || item.color === 'dark-blue';
                } else if (filters.color === 'light') {
                  return item.color === 'white' || item.color === 'light-blue' || item.color === 'cream';
                } else {
                  return item.color === filters.color;
                }
              }
              return true;
            }
            return false;
          });
        } else if (filters.category === 'books') {
          result = result.filter(item => {
            if (item.category === 'books') {
              if (filters.genre) {
                if (filters.genre === 'fiction') {
                  return item.genre === 'fiction' && item.rating > 3;
                } else if (filters.genre === 'non-fiction') {
                  return item.genre === 'non-fiction' && item.pages > 100;
                } else if (filters.genre === 'technical') {
                  return item.genre === 'technical' && item.year > 2015;
                } else {
                  return item.genre === filters.genre;
                }
              }
              return true;
            }
            return false;
          });
        }
      }
      
      if (filters.priceRange) {
        if (filters.priceRange.min !== undefined || filters.priceRange.max !== undefined) {
          result = result.filter(item => {
            if (filters.priceRange.min !== undefined && filters.priceRange.max !== undefined) {
              return item.price >= filters.priceRange.min && item.price <= filters.priceRange.max;
            } else if (filters.priceRange.min !== undefined) {
              return item.price >= filters.priceRange.min;
            } else if (filters.priceRange.max !== undefined) {
              return item.price <= filters.priceRange.max;
            }
            return true;
          });
        }
      }
      
      if (filters.availability) {
        if (filters.availability === 'in-stock') {
          result = result.filter(item => item.stock > 0);
        } else if (filters.availability === 'low-stock') {
          result = result.filter(item => item.stock > 0 && item.stock <= 5);
        } else if (filters.availability === 'out-of-stock') {
          result = result.filter(item => item.stock === 0);
        }
      }
    }
    
    // Complex sorting logic
    if (sorting && sorting.field) {
      result.sort((a, b) => {
        let comparison = 0;
        
        if (sorting.field === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sorting.field === 'price') {
          comparison = a.price - b.price;
        } else if (sorting.field === 'rating') {
          if (a.rating && b.rating) {
            comparison = a.rating - b.rating;
          } else if (a.rating) {
            comparison = 1;
          } else if (b.rating) {
            comparison = -1;
          }
        } else if (sorting.field === 'date') {
          const dateA = new Date(a.createdAt || a.date || 0);
          const dateB = new Date(b.createdAt || b.date || 0);
          comparison = dateA.getTime() - dateB.getTime();
        } else if (sorting.field === 'stock') {
          comparison = a.stock - b.stock;
        }
        
        return sorting.direction === 'desc' ? -comparison : comparison;
      });
    }
    
    // Additional processing based on search term
    if (searchTerm && searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => {
        if (item.name && item.name.toLowerCase().includes(term)) {
          return true;
        }
        if (item.description && item.description.toLowerCase().includes(term)) {
          return true;
        }
        if (item.tags && Array.isArray(item.tags)) {
          return item.tags.some((tag: string) => tag.toLowerCase().includes(term));
        }
        if (item.category && item.category.toLowerCase().includes(term)) {
          return true;
        }
        return false;
      });
    }
    
    return result;
  };

  const handleItemClick = (item: any) => {
    if (bulkMode) {
      if (selectedItems.includes(item.id)) {
        setSelectedItems(prev => prev.filter(id => id !== item.id));
      } else {
        setSelectedItems(prev => [...prev, item.id]);
      }
    } else {
      props.onItemClick(item.id);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedItems.length > 0) {
      props.onBulkAction(action, selectedItems);
      setSelectedItems([]);
      setBulkMode(false);
    }
  };

  const processedItems = processItems(props.items, props.filters, props.sorting);

  return (
    <div className="complex-function-component">
      <div className="header">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => setBulkMode(!bulkMode)}>
          {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
        </button>
      </div>
      
      {bulkMode && selectedItems.length > 0 && (
        <div className="bulk-actions">
          <button onClick={() => handleBulkAction('delete')}>Delete Selected</button>
          <button onClick={() => handleBulkAction('archive')}>Archive Selected</button>
          <button onClick={() => handleBulkAction('export')}>Export Selected</button>
        </div>
      )}
      
      <div className="items-list">
        {processedItems.map(item => (
          <div
            key={item.id}
            className={`item ${selectedItems.includes(item.id) ? 'selected' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="item-content">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <span className="price">${item.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 