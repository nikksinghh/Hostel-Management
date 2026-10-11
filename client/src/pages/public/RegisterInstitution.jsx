import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, User, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div className="card" style={{ maxWidth: '820px', width: '100%', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              marginBottom: '1rem'
            }}>
              <Building2 size={32} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              Partner with CampusHome
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '580px', margin: '0 auto' }}>
              Onboard your college, university, or hostel facility onto our unified multi-tenant residential management ecosystem.
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <ShieldCheck size={40} color="var(--success)" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Application Submitted Successfully
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '520px', margin: '0 auto 2rem auto' }}>
                Your institution registration request has been submitted for review. 
                Our platform administrators will inspect the credentials and activate your organization tenant. 
                <strong style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                  You will receive an email once approved to log in to your dashboard.
                </strong>
              </p>
              <Link to="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.75rem', textDecoration: 'none' }}>
                Return to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Institution Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <Building2 size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Institution Profile</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label className="form-label">Institution Name *</label>
                    <input type="text" name="name" className="form-input" placeholder="e.g. Stanford University" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label">Type of Facility *</label>
                    <select name="institution_type" className="form-select" value={formData.institution_type} onChange={handleChange} required>
                      <option value="University">University</option>
                      <option value="College">College</option>
                      <option value="School">School</option>
                      <option value="Other">Other Residential Campus</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Institution Code / Affiliation ID *</label>
                    <input type="text" name="code" className="form-input" placeholder="e.g. STAN24" value={formData.code} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label">Official Administrative Email *</label>
                    <input type="email" name="contact_email" className="form-input" placeholder="admin@stanford.edu" value={formData.contact_email} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label">Contact Phone *</label>
                    <input type="text" name="contact_phone" className="form-input" placeholder="+91 98765 43210" value={formData.contact_phone} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label">Website</label>
                    <input type="url" name="website" className="form-input" placeholder="https://www.stanford.edu" value={formData.website} onChange={handleChange} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Campus Address *</label>
                    <textarea name="address" className="form-textarea" rows="2" placeholder="Full campus street address" value={formData.address} onChange={handleChange} required></textarea>
                  </div>
                  <div>
                    <label className="form-label">City *</label>
                    <input type="text" name="city" className="form-input" placeholder="City" value={formData.city} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="form-label">State / Province *</label>
                    <input type="text" name="state" className="form-input" placeholder="State" value={formData.state} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              {/* Initial Administrator */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <User size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Primary Administrator Account</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  This user will become the designated Master Tenant Admin for your institution once approved by Super Admins.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label className="form-label">Admin Full Name *</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', top: '50%', left: '0.85rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="text" name="admin_full_name" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Dr. Sarah Jenkins" value={formData.admin_full_name} onChange={handleChange} required />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Admin Work Email (Login ID) *</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', top: '50%', left: '0.85rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="email" name="admin_email" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="sarah.jenkins@stanford.edu" value={formData.admin_email} onChange={handleChange} required />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Password * (min 6 chars)</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', top: '50%', left: '0.85rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="password" name="admin_password" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="••••••••" value={formData.admin_password} onChange={handleChange} required minLength="6" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Confirm Password *</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', top: '50%', left: '0.85rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="password" name="confirm_password" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="••••••••" value={formData.confirm_password} onChange={handleChange} required minLength="6" />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert-danger" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 600 }} disabled={loading}>
                {loading ? 'Submitting Registration...' : 'Submit Institutional Registration'}
              </button>

              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Already registered? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign In here</Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default RegisterInstitution;
