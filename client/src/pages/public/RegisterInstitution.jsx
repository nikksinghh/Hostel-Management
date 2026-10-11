import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import Navbar from '../../components/common/Navbar';

const RegisterInstitution = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    institution_type: 'University',
    code: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    website: '',
    admin_full_name: '',
    admin_email: '',
    admin_phone: '',
    admin_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (formData.admin_password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/public/institutions/register', formData);
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register institution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-mesh" />
      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%', padding: '2.5rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent-gradient)', marginBottom: '1rem' }}>
              <Building2 size={32} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Partner with CampusHome</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Register your institution to access our comprehensive residential management suite.
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <ShieldCheck size={64} color="#10b981" style={{ margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '1.8rem', color: '#10b981', marginBottom: '1rem' }}>Application Submitted</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
                Your institution registration has been received successfully. 
                Our Main Admins will review your application. 
                <strong> You will not be able to access the dashboard until approved.</strong>
              </p>
              <Link to="/" className="btn btn-primary btn-lg">Return to Home</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Institution Details */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Institution Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Institution Name</label>
                    <input type="text" name="name" className="form-input" placeholder="e.g. Stanford University" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select name="institution_type" className="form-select" value={formData.institution_type} onChange={handleChange} required>
                      <option value="University">University</option>
                      <option value="College">College</option>
                      <option value="School">School</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unique Code / Affiliation ID</label>
                    <input type="text" name="code" className="form-input" placeholder="e.g. STAN24" value={formData.code} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Official Email</label>
                    <input type="email" name="contact_email" className="form-input" placeholder="admin@stanford.edu" value={formData.contact_email} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input type="text" name="contact_phone" className="form-input" placeholder="+1 234 567 8900" value={formData.contact_phone} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input type="url" name="website" className="form-input" placeholder="https://www.stanford.edu" value={formData.website} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Complete Address</label>
                    <textarea name="address" className="form-textarea" rows="2" placeholder="Full address" value={formData.address} onChange={handleChange} required></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" name="city" className="form-input" placeholder="City" value={formData.city} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State/Province</label>
                    <input type="text" name="state" className="form-input" placeholder="State" value={formData.state} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Initial Administrator */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Initial Administrator</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>This user will have full access to manage your institution once approved.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="text" name="admin_full_name" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Admin Name" value={formData.admin_full_name} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admin Email (Login ID)</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="email" name="admin_email" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="admin.login@inst.edu" value={formData.admin_email} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="password" name="admin_password" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="••••••••" value={formData.admin_password} onChange={handleChange} required minLength="6" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="password" name="confirm_password" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="••••••••" value={formData.confirm_password} onChange={handleChange} required minLength="6" />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.9rem', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Submitting Application...' : 'Submit Registration Application'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                Already registered? <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Login here</Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default RegisterInstitution;
