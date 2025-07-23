import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';

// This file demonstrates React patterns that should be detected by React patterns plugin

// Missing dependency in useEffect
export function ReactPatternsExample({ userId, filter, onUpdate }: any) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  // BAD: Missing dependency - userId should be in deps array
  useEffect(() => {
    console.log('Effect running for user:', userId);
    fetchUserData(userId);
  }, []); // Missing userId in dependencies

  // BAD: Missing dependency - filter should be in deps array
  useEffect(() => {
    if (filter && data) {
      const filteredData = data.filter((item: any) => item.category === filter);
      console.log('Filtered data:', filteredData);
    }
  }, [data]); // Missing filter in dependencies

  // BAD: Missing cleanup in useEffect
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);
    
    // Missing cleanup - should return cleanup function
  }, []);

  // BAD: useCallback with missing dependencies
  const handleUpdate = useCallback(() => {
    if (data && userId) {
      onUpdate(userId, data);
    }
  }, [data]); // Missing userId and onUpdate in dependencies

  // BAD: useMemo with missing dependencies
  const expensiveCalculation = useMemo(() => {
    if (data && filter) {
      return data.reduce((acc: number, item: any) => {
        if (item.category === filter) {
          return acc + item.value;
        }
        return acc;
      }, 0);
    }
    return 0;
  }, [data]); // Missing filter in dependencies

  const fetchUserData = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${id}`);
      const userData = await response.json();
      setData(userData);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="react-patterns-example">
      <h2>React Patterns Example</h2>
      <p>User ID: {userId}</p>
      <p>Filter: {filter}</p>
      <p>Count: {count}</p>
      <p>Expensive calculation: {expensiveCalculation}</p>
      
      {loading && <div>Loading...</div>}
      
      {data && (
        <div>
          <h3>User Data</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      
      <button onClick={handleUpdate}>Update Data</button>
    </div>
  );
}

// Component with multiple hook dependency issues
export function HookDependencyIssues({ items, onSelectionChange, theme }: any) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // BAD: Multiple missing dependencies
  useEffect(() => {
    const filtered = items.filter((item: any) => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filtered.length !== selectedItems.length) {
      onSelectionChange(filtered.map((item: any) => item.id));
    }
  }, []); // Missing items, searchTerm, selectedItems, onSelectionChange

  // BAD: Missing dependency and no cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Theme applied:', theme);
    }, 1000);
    
    // Missing cleanup and theme dependency
  }, []);

  // BAD: useCallback with wrong dependencies
  const handleItemToggle = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        const newSelection = prev.filter(id => id !== itemId);
        onSelectionChange(newSelection);
        return newSelection;
      } else {
        const newSelection = [...prev, itemId];
        onSelectionChange(newSelection);
        return newSelection;
      }
    });
  }, [selectedItems]); // Wrong: selectedItems changes, should only include onSelectionChange

  return (
    <div className="hook-dependency-issues">
      <h3>Hook Dependency Issues Component</h3>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {items?.map((item: any) => (
        <div key={item.id} onClick={() => handleItemToggle(item.id)}>
          {item.name} {selectedItems.includes(item.id) ? '✓' : ''}
        </div>
      ))}
    </div>
  );
}

// Legacy class component for migration testing
export class LegacyClassComponent extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      data: null,
      loading: false,
      error: null
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps: any) {
    if (prevProps.id !== this.props.id) {
      this.fetchData();
    }
  }

  componentWillUnmount() {
    // Cleanup logic
  }

  fetchData = async () => {
    this.setState({ loading: true });
    try {
      const response = await fetch(`/api/data/${this.props.id}`);
      const data = await response.json();
      this.setState({ data, loading: false });
    } catch (error) {
      this.setState({ error, loading: false });
    }
  };

  render() {
    const { data, loading, error } = this.state;
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    
    return (
      <div className="legacy-class-component">
        <h3>Legacy Class Component</h3>
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>
    );
  }
} 