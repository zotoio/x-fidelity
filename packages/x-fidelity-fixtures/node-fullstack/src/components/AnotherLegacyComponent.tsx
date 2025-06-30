import React, { Component } from 'react';
import { createRef } from 'react';

// Second file to trigger lowMigrationToNewComponentLib-global rule
// Uses more legacy class component patterns

export class LegacyDataTable extends Component<any, any> {
  private tableRef = createRef<HTMLTableElement>();

  constructor(props: any) {
    super(props);
    this.state = {
      data: props.data || [],
      sortColumn: null,
      sortDirection: 'asc',
      selectedRows: [],
      loading: false
    };
  }

  componentWillReceiveProps(nextProps: any) {
    // Deprecated lifecycle method - triggers legacy pattern detection
    if (nextProps.data !== this.props.data) {
      this.setState({ data: nextProps.data });
    }
  }

  componentWillUpdate() {
    // Another deprecated lifecycle method
    console.log('Table will update');
  }

  handleSort = (column: string) => {
    const { sortColumn, sortDirection } = this.state;
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    
    this.setState({
      sortColumn: column,
      sortDirection: newDirection
    });
  };

  handleRowSelect = (id: string) => {
    const { selectedRows } = this.state;
    const newSelected = selectedRows.includes(id)
      ? selectedRows.filter((rowId: string) => rowId !== id)
      : [...selectedRows, id];
    
    this.setState({ selectedRows: newSelected });
  };

  getSortedData = () => {
    const { data, sortColumn, sortDirection } = this.state;
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  render() {
    const { selectedRows } = this.state;
    const sortedData = this.getSortedData();

    return (
      <div style={{ padding: '10px' }}>
        <table ref={this.tableRef} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>
                <input type="checkbox" />
              </th>
              <th 
                style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}
                onClick={() => this.handleSort('name')}
              >
                Name
              </th>
              <th 
                style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}
                onClick={() => this.handleSort('email')}
              >
                Email
              </th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row: any) => (
              <tr key={row.id}>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.id)}
                    onChange={() => this.handleRowSelect(row.id)}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.name}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.email}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <LegacyDropdown />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

export class LegacyDropdown extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      isOpen: false,
      selectedValue: props.value || ''
    };
  }

  toggle = () => {
    this.setState({ isOpen: !this.state.isOpen });
  };

  selectOption = (value: string) => {
    this.setState({
      selectedValue: value,
      isOpen: false
    });
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  };

  render() {
    const { isOpen, selectedValue } = this.state;
    const options = this.props.options || ['Edit', 'Delete', 'View'];

    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={this.toggle}
          style={{
            padding: '5px 10px',
            border: '1px solid #ccc',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          {selectedValue || 'Actions'} ▼
        </button>
        
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'white',
            border: '1px solid #ccc',
            borderTop: 'none',
            zIndex: 10,
            minWidth: '100px'
          }}>
            {options.map((option: string) => (
              <div
                key={option}
                onClick={() => this.selectOption(option)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'white';
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

// Legacy pagination component
export class LegacyPagination extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      currentPage: props.currentPage || 1
    };
  }

  goToPage = (page: number) => {
    this.setState({ currentPage: page });
    if (this.props.onPageChange) {
      this.props.onPageChange(page);
    }
  };

  render() {
    const { currentPage } = this.state;
    const { totalPages = 10 } = this.props;

    return (
      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', margin: '20px 0' }}>
        <button
          onClick={() => this.goToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '5px 10px',
            border: '1px solid #ccc',
            background: currentPage === 1 ? '#f5f5f5' : 'white',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => this.goToPage(page)}
            style={{
              padding: '5px 10px',
              border: '1px solid #ccc',
              background: page === currentPage ? '#007bff' : 'white',
              color: page === currentPage ? 'white' : 'black',
              cursor: 'pointer'
            }}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => this.goToPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '5px 10px',
            border: '1px solid #ccc',
            background: currentPage === totalPages ? '#f5f5f5' : 'white',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
      </div>
    );
  }
}

export default LegacyDataTable; 