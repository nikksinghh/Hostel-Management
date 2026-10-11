import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import api from '../api/axios';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Utensils,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Bed,
  Compass,
  AlertTriangle,
  Zap,
  ChevronRight
} from 'lucide-react';

const LandingPage = () => {
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{ padding: '5rem 1.5rem 3.5rem', maxWidth: '1280px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-primary-subtle)',
          border: '1px solid #C7D2FE',
          color: 'var(--accent-primary)',
          fontSize: '0.84rem',
          fontWeight: 600,
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={16} />
          <span>Next-Generation Residential Campus Management System</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.3rem, 5vw, 3.8rem)', lineHeight: 1.18, marginBottom: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Smart Living. Seamless Safety. <br />
          <span style={{ color: 'var(--accent-primary)' }}>Complete Campus Home.</span>
        </h1>

        <p style={{ fontSize: '1.12rem', color: 'var(--text-secondary)', maxWidth: '740px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Empowering university administrators, wardens, and students with GPS geofenced attendance, 
          instant SOS emergency alerts, live mess menus, grievance ticketing, and smart room allocation.
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

        {/* Highlight Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginTop: '4rem',
          textAlign: 'left'
        }}>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">Hostel Blocks</span>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={19} />
              </div>
            </div>
            <div className="stat-value">{stats.totalHostels || 3}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Boys & Girls Residential Units</div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">Active Residents</span>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={19} />
              </div>
            </div>
            <div className="stat-value">{stats.totalStudents || 4}+</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Student Profiles</div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">Bed Capacity</span>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bed size={19} />
              </div>
            </div>
            <div className="stat-value">{stats.totalBeds || 10} Beds</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Single, double & triple units</div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">Campus Safety</span>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={19} />
              </div>
            </div>
            <div className="stat-value">24x7</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SOS alert & warden supervision</div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.1rem', marginBottom: '0.65rem' }}>
            Engineered for <span style={{ color: 'var(--accent-primary)' }}>Modern Campus Life</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto' }}>
            Everything needed to manage hostels efficiently, transparently, and securely in one unified institutional platform.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Compass size={22} />
            </div>
            <h3 style={{ fontSize: '1.18rem', marginBottom: '0.45rem' }}>Smart Geofenced Attendance</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Automated GPS coordinates verification ensures students check-in only when physically inside the designated hostel perimeter.
            </p>
          </div>

          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ fontSize: '1.18rem', marginBottom: '0.45rem' }}>1-Click SOS Emergency Alert</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Instant distress beacon triggered by students immediately alerts wardens and admins with real-time room number and parent contacts.
            </p>
          </div>

          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Utensils size={22} />
            </div>
            <h3 style={{ fontSize: '1.18rem', marginBottom: '0.45rem' }}>Live Weekly Mess Menu</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Students can view daily Breakfast, Lunch, Snacks, and Dinner schedules curated by the mess committee and hostel wardens.
            </p>
          </div>

          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <CheckCircle2 size={22} />
            </div>
            <h3 style={{ fontSize: '1.18rem', marginBottom: '0.45rem' }}>Automated Leave Approvals</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Apply for outstation or medical leave online with supporting docs; wardens approve with remarks and automatic attendance synchronization.
            </p>
          </div>

          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: '1.18rem', marginBottom: '0.45rem' }}>Complaint Ticketing Center</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Lodge electrical, plumbing, carpentry, and WiFi grievances with photo attachments and track real-time resolution status.
            </p>
          </div>

          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: '#F5F3FF', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Building2 size={22} />
            </div>
            <h3 style={{ fontSize: '1.18rem', marginBottom: '0.45rem' }}>Smart Room Allocation Matrix</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Complete occupancy tracking, bed vacancy counters, roommate lists, and automated room transfer request workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Campus Gallery Showcase */}
      <section style={{ padding: '1rem 1.5rem 4rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ height: '220px', overflow: 'hidden', position: 'relative', background: '#F1F5F9' }}>
              <img
                src="/khalsa-college-of-engineering-technology-amritsar-273616.webp"
                alt="Campus View"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="badge badge-indigo" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>Engineering Campus</span>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.12rem', marginBottom: '0.35rem' }}>Modern Infrastructure & Green Campus</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>High-speed fiber connectivity, power backup, CCTV surveillance and 24/7 security guard patrol.</p>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ height: '220px', overflow: 'hidden', position: 'relative', background: '#F1F5F9' }}>
              <img
                src="/khalsa-college-of-engineering-technology-amritsar-273619.webp"
                alt="Hostel Block"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="badge badge-success" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>Residential Blocks</span>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.12rem', marginBottom: '0.35rem' }}>Comfortable Living & Recreation</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hygienic mess dining halls, indoor sports zone, reading library and air-cooled spacious rooms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Notice Board Section */}
      {notices.length > 0 && (
        <section style={{ padding: '0 1.5rem 4rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>📢</span>
              <h2 style={{ fontSize: '1.4rem' }}>Live Campus Circulars & Notice Board</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {notices.map((n) => (
                <div key={n._id} style={{ background: '#F8FAFC', border: n.is_pinned ? '1px solid #FCD34D' : '1px solid var(--border-color)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="badge badge-indigo">{n.category}</span>
                    {n.is_pinned && <span className="badge badge-warning">📌 Pinned</span>}
                  </div>
                  <h4 style={{ fontSize: '1.02rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{n.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>{n.content}</p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Posted by: <strong style={{ color: 'var(--text-primary)' }}>{n.posted_by}</strong> • {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hostels Section */}
      <section id="hostels" style={{ padding: '0 1.5rem 4rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Campus Residential Hostels</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Explore our state-of-the-art on-campus residential facilities.</p>
          </div>
          <Link to="/login" className="btn btn-secondary btn-sm">
            <span>Apply for Admission</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {hostels.length > 0 ? (
            hostels.map((h) => (
              <div key={h._id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className={`badge ${h.type === 'Boys' ? 'badge-indigo' : 'badge-purple'}`}>
                    {h.type} Hostel
                  </span>
                  <span className="badge badge-neutral">{h.block_number}</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>{h.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <MapPin size={16} color="var(--accent-primary)" />
                  <span>{h.address || 'Campus Residential Zone'}</span>
                </div>
                {h.contact_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <PhoneCall size={16} color="var(--success)" />
                    <span>{h.contact_number}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              <Building2 size={36} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Hostel blocks are ready. Log in to manage accommodations.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '0 1.5rem 4rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'var(--bg-sidebar)',
          color: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.85rem', color: '#FFFFFF' }}>Ready to experience seamless hostel management?</h2>
          <p style={{ color: 'var(--text-sidebar)', maxWidth: '580px', margin: '0 auto 2rem', fontSize: '1rem' }}>
            Access your dashboard with role-based sign-in for Institutional Admins, Wardens, or Students.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">
            <span>Go to Login Portal</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', background: '#FFFFFF', padding: '1.75rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
        <p>© 2026 CampusHome Hostel Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
