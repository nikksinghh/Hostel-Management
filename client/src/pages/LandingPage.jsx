import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import api from '../api/axios';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Utensils,
  Clock,
  Zap,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Bed,
  Compass,
  AlertTriangle,
  Award
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [stats, setStats] = useState({ totalStudents: 4, totalHostels: 3, totalRooms: 5, totalBeds: 10 });
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [hostelRes, statsRes, noticesRes] = await Promise.all([
          api.get('/public/hostels'),
          api.get('/public/overview'),
          api.get('/notices'),
        ]);
        if (hostelRes.data.success) setHostels(hostelRes.data.hostels);
        if (statsRes.data.success) setStats(statsRes.data.stats);
        if (noticesRes.data.success) setNotices(noticesRes.data.notices);
      } catch (err) {
        console.error('Failed to load public data', err);
      }
    };
    fetchPublicData();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-mesh" />
      <Navbar />

      {/* Hero Section */}
      <section style={{ padding: '4.5rem 1.5rem 3.5rem', maxWidth: '1300px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#a5b4fc',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={16} color="#818cf8" />
          <span>Next-Generation Residential Campus Management System</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 1.15, marginBottom: '1.25rem' }}>
          Smart Living. Seamless Safety. <br />
          <span className="text-gradient">Complete Campus Home.</span>
        </h1>

        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '780px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Empowering university administrators, wardens, and students with GPS geofenced attendance, 
          instant SOS emergency response, interactive mess menus, complaint tracking, and smart room allocation.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn btn-primary btn-lg" style={{ minWidth: '180px' }}>
            <span>Access Portal</span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/register-institution" className="btn btn-secondary btn-lg" style={{ minWidth: '180px' }}>
            <span>Register Institution</span>
            <Building2 size={18} />
          </Link>
        </div>

        {/* Highlight Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '4rem',
          textAlign: 'left'
        }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#818cf8' }}>
              <Building2 size={22} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Hostel Blocks</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff' }}>{stats.totalHostels || 3}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Boys & Girls Residential Units</div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#34d399' }}>
              <Users size={22} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Residents</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff' }}>{stats.totalStudents || 4}+</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Student Profiles</div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#38bdf8' }}>
              <Bed size={22} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Bed Capacity</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff' }}>{stats.totalBeds || 10} Beds</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Across single, double & triple rooms</div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#f43f5e' }}>
              <ShieldCheck size={22} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Campus Safety</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff' }}>24x7</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SOS broadcast & warden supervision</div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>
            Engineered for <span className="text-gradient">Modern Campus Life</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Everything needed to manage hostels efficiently, transparently, and safely in one unified suite.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-cyan-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Compass size={24} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Smart Geofenced Attendance</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Automated GPS coordinates verification ensures students check-in only when physically inside the designated hostel radius.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-rose-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <AlertTriangle size={24} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>1-Click SOS Emergency Alert</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Instant distress beacon triggered by students immediately alerts wardens and admins with real-time room number and emergency contacts.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-amber-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Utensils size={24} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Live Weekly Mess Menu</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Students can view daily Breakfast, Lunch, Snacks, and Dinner menus scheduled by the mess committee and hostel wardens.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-emerald-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <CheckCircle2 size={24} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Automated Leave Approvals</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Apply for outstation or medical leave online with supporting docs; wardens approve with remarks and automatic attendance synchronization.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Zap size={24} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Complaint Ticketing Center</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Lodge electrical, plumbing, carpentry, and WiFi grievances with photo attachments and track real-time resolution status.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Building2 size={24} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Smart Room Allocation Matrix</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Complete occupancy tracking, bed vacancy counters, roommate lists, and automated room transfer request workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Campus Gallery Showcase */}
      <section style={{ padding: '2rem 1.5rem 4rem', maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.75rem'
        }}>
          <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ height: '230px', overflow: 'hidden', position: 'relative' }}>
              <img
                src="/khalsa-college-of-engineering-technology-amritsar-273616.webp"
                alt="Campus View"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 15, 25, 0.9) 0%, transparent 70%)' }} />
              <span className="badge badge-purple" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>Engineering Campus</span>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.35rem' }}>Modern Infrastructure & Green Campus</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>High-speed fiber connectivity, power backup, CCTV surveillance and 24/7 security guard patrol.</p>
            </div>
          </div>

          <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ height: '230px', overflow: 'hidden', position: 'relative' }}>
              <img
                src="/khalsa-college-of-engineering-technology-amritsar-273619.webp"
                alt="Hostel Block"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 15, 25, 0.9) 0%, transparent 70%)' }} />
              <span className="badge badge-success" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>Residential Blocks</span>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.35rem' }}>Comfortable Living & Recreation</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hygienic mess dining halls, indoor sports zone, reading library and air-cooled spacious rooms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Notice Board Section */}
      {notices.length > 0 && (
        <section style={{ padding: '0 1.5rem 4rem', maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📢</span>
              <h2 style={{ fontSize: '1.5rem', color: '#ffffff' }}>Live Campus Circulars & Notice Board</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {notices.map((n) => (
                <div key={n._id} style={{ background: 'rgba(15, 23, 42, 0.65)', border: n.is_pinned ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="badge badge-info">{n.category}</span>
                    {n.is_pinned && <span className="badge badge-warning">📌 Pinned</span>}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.4rem' }}>{n.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>{n.content}</p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Posted by: <strong>{n.posted_by}</strong> • {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hostels Section */}
      <section id="hostels" style={{ padding: '0 1.5rem 4rem', maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Campus Residential Hostels</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Explore our state-of-the-art on-campus residential facilities.</p>
          </div>
          <Link to="/login" className="btn btn-secondary btn-sm">
            Apply for Admission
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {hostels.length > 0 ? (
            hostels.map((h) => (
              <div key={h._id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className={`badge ${h.type === 'Boys' ? 'badge-info' : 'badge-purple'}`}>
                    {h.type} Hostel
                  </span>
                  <span className="badge badge-success">{h.block_number}</span>
                </div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>{h.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <MapPin size={16} color="#818cf8" />
                  <span>{h.address || 'Campus Residential Zone'}</span>
                </div>
                {h.contact_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <PhoneCall size={16} color="#34d399" />
                    <span>{h.contact_number}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              <Building2 size={36} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Hostel blocks are ready. Log in to manage accommodations.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto 3rem', width: '100%' }}>
        <div className="glass-card" style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>Ready to experience seamless hostel management?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Access your dashboard with quick role-based login credentials for Admin, Warden, or Student.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">
            <span>Go to Login Portal</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>© 2026 CampusHome Hostel Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
