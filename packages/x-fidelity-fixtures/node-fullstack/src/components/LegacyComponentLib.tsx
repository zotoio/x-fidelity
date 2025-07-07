import React, { Component } from 'react';
// This file uses legacy component patterns to trigger lowMigrationToNewComponentLib-global rule

// Using old class-based components instead of modern functional components
export class LegacyButton extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      clicked: false
    };
  }

  handleClick = () => {
    this.setState({ clicked: true });
    setTimeout(() => {
      this.setState({ clicked: false });
    }, 1000);
  };

  render() {
    return (
      <button 
        onClick={this.handleClick}
        style={{
          backgroundColor: this.state.clicked ? '#ff6b6b' : '#4dabf7',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px'
        }}
      >
        {this.props.children}
      </button>
    );
  }
}

// Legacy modal component
export class LegacyModal extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      isOpen: props.isOpen || false
    };
  }

  componentDidUpdate(prevProps: any) {
    if (prevProps.isOpen !== this.props.isOpen) {
      this.setState({ isOpen: this.props.isOpen });
    }
  }

  close = () => {
    this.setState({ isOpen: false });
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    if (!this.state.isOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          minWidth: '300px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3>{this.props.title}</h3>
            <button onClick={this.close} style={{ background: 'none', border: 'none', fontSize: '18px' }}>×</button>
          </div>
          {this.props.children}
        </div>
      </div>
    );
  }
}

// Legacy form component
export class LegacyForm extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      values: {},
      errors: {}
    };
  }

  handleChange = (field: string) => (event: any) => {
    this.setState({
      values: {
        ...this.state.values,
        [field]: event.target.value
      }
    });
  };

  validate = () => {
    const errors: any = {};
    const { values } = this.state;

    if (!values.name) {
      errors.name = 'Name is required';
    }

    if (!values.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      errors.email = 'Email is invalid';
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  handleSubmit = (event: any) => {
    event.preventDefault();
    if (this.validate()) {
      if (this.props.onSubmit) {
        this.props.onSubmit(this.state.values);
      }
    }
  };

  render() {
    const { values, errors } = this.state;

    return (
      <form onSubmit={this.handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Name:</label>
          <input
            type="text"
            value={values.name || ''}
            onChange={this.handleChange('name')}
            style={{
              width: '100%',
              padding: '8px',
              border: errors.name ? '1px solid red' : '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          {errors.name && <div style={{ color: 'red', fontSize: '12px' }}>{errors.name}</div>}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={values.email || ''}
            onChange={this.handleChange('email')}
            style={{
              width: '100%',
              padding: '8px',
              border: errors.email ? '1px solid red' : '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          {errors.email && <div style={{ color: 'red', fontSize: '12px' }}>{errors.email}</div>}
        </div>

        <LegacyButton type="submit">
          Submit
        </LegacyButton>
      </form>
    );
  }
}

// Main component that uses all legacy patterns
export class LegacyComponentDemo extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      showModal: false,
      users: []
    };
  }

  componentDidMount() {
    // Legacy lifecycle method
    console.log('Legacy component mounted');
  }

  openModal = () => {
    this.setState({ showModal: true });
  };

  closeModal = () => {
    this.setState({ showModal: false });
  };

  handleFormSubmit = (values: any) => {
    this.setState({
      users: [...this.state.users, { ...values, id: Date.now() }],
      showModal: false
    });
  };

  render() {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Legacy Component Library Demo</h2>
        <p>This component uses old patterns instead of modern component libraries</p>
        
        <LegacyButton onClick={this.openModal}>
          Add User (Legacy Modal)
        </LegacyButton>

        <div style={{ marginTop: '20px' }}>
          <h3>Users ({this.state.users.length}):</h3>
          {this.state.users.map((user: any) => (
            <div key={user.id} style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '5px 0',
              borderRadius: '4px'
            }}>
              <strong>{user.name}</strong> - {user.email}
            </div>
          ))}
        </div>

        <LegacyModal
          isOpen={this.state.showModal}
          onClose={this.closeModal}
          title="Add New User"
        >
          <LegacyForm onSubmit={this.handleFormSubmit} />
        </LegacyModal>
      </div>
    );
  }
}

export default LegacyComponentDemo; 