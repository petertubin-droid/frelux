import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Phone, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  fetchCategories, fetchServices, fetchLocations,
  createProProfile, updateProProfile, updateProfileServices, updateProfileLocations,
  getMyProProfile, generateProSlug, isSlugAvailable,
  upgradeToProWorker, getAccountType,
} from '@/lib/pro-connect';
import type { AccountType } from '@/types/pro-connect';
import type { DbProCategory, DbProService, DbProLocation, DbProProfile } from '@/types/pro-connect';
import { classNames } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getSafeError } from "@/lib/safeError";

export default function ProConnectRegister() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<DbProCategory[]>([]);
  const [services, setServices] = useState<DbProService[]>([]);
  const [locations, setLocations] = useState<DbProLocation[]>([]);
  const [existingProfile, setExistingProfile] = useState<DbProProfile | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [availability, setAvailability] = useState<'available' | 'busy' | 'unavailable'>('available');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [_accountType, _setAccountType] = useState<AccountType>('client');
  const [error, setError] = useState('');

  // Phase 31: Mobile OTP verification state
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const _cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phase 31: NIN KYC verification state
  const [ninNumber, setNinNumber] = useState('');
  const [ninSubmitting, setNinSubmitting] = useState(false);
  const [ninError, setNinError] = useState('');
  const [ninSuccess, setNinSuccess] = useState('');
  const [ninSubmitted, setNinSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/pro-connect/register');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.email?.split('@')[0] || '');
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      const [cats, svcs, locs] = await Promise.all([
        fetchCategories(),
        fetchServices(),
        fetchLocations(),
      ]);
      setCategories(cats);
      setServices(svcs);
      setLocations(locs);

      // Check account type and upgrade to pro_worker if needed
      if (user) {
        const acct = await getAccountType(user.id);
        _setAccountType(acct);
        if (acct === 'client') {
          await upgradeToProWorker();
          _setAccountType('pro_worker');
        }
      }

      // Check for existing profile
      if (user) {
        const existing = await getMyProProfile(user.id);
        if (existing) {
          setExistingProfile(existing);
          setProfileId(existing.id);
          setDisplayName(existing.display_name);
          setBusinessName(existing.business_name || '');
          setCategoryId(existing.category_id || '');
          setSlug(existing.slug);
          setBio(existing.bio || '');
          setYearsExperience(existing.years_experience?.toString() || '');
          setPhone(existing.contact_phone || '');
          setWebsite(existing.website_url || '');
          setAvailability(existing.availability);
          setStep(1);
        }
      }
    })();
  }, [user]);

  const states = [...new Set(locations.map((l) => l.state))].sort();
  const filteredServices = categoryId ? services.filter((s) => s.category_id === categoryId) : services;

  // Auto-generate slug
  useEffect(() => {
    if (!existingProfile) {
      const generated = generateProSlug(displayName || businessName || 'professional');
      setSlug(generated);
    }
  }, [displayName, businessName, existingProfile]);

  async function handleStep1Submit() {
    if (!displayName.trim()) { setError('Display name is required'); return; }
    if (!categoryId) { setError('Please select a category'); return; }

    setSaving(true);
    setError('');

    if (!profileId) {
      // Check slug availability
      const available = await isSlugAvailable(slug);
      let finalSlug = slug;
      if (!available) {
        finalSlug = generateProSlug(slug + '-' + Date.now().toString().slice(-4));
        setSlug(finalSlug);
      }

      const result = await createProProfile({
        display_name: displayName,
        slug: finalSlug,
        category_id: categoryId,
        business_name: businessName || undefined,
        bio: bio || undefined,
        years_experience: yearsExperience ? parseInt(yearsExperience) : undefined,
        contact_phone: phone || undefined,
        website_url: website || undefined,
      });
      if (result) {
        setProfileId(result.id);
      } else {
        setError('Failed to create profile. Please try again.');
        setSaving(false);
        return;
      }
    } else {
      await updateProProfile(profileId, {
        display_name: displayName,
        category_id: categoryId,
        business_name: businessName || null,
        bio: bio || null,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        contact_phone: phone || null,
        website_url: website || null,
      } as Partial<DbProProfile>);
    }

    setSaving(false);
    setStep(2);
  }

  async function handleStep2Submit() {
    if (!profileId) return;
    setSaving(true);
    await updateProfileServices(profileId, selectedServices);
    setSaving(false);
    setStep(3);
  }

  async function handleStep3Submit() {
    if (!profileId) return;
    setSaving(true);
    await updateProfileLocations(profileId, selectedLocations);
    await updateProProfile(profileId, { availability, is_profile_complete: true, is_listed: true } as Partial<DbProProfile>);
    setSaving(false);
    setStep(4);
  }



  // OTP handlers
  async function handleSendOTP() {
    if (!mobileNumber.trim()) { setOtpError('Enter a mobile number'); return; }
    setOtpSending(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: mobileNumber,
      });
      if (otpError) throw otpError;
      setOtpSent(true);
      setOtpSuccess('OTP sent to ' + mobileNumber);
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setOtpError(getSafeError(err, 'Failed to send OTP'));
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOTP() {
    if (otpCode.length !== 6) { setOtpError('Enter the 6-digit code'); return; }
    setOtpSending(true);
    setOtpError('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: mobileNumber,
        token: otpCode,
        type: 'sms',
      });
      if (verifyError) throw verifyError;
      setOtpSuccess('Phone number verified successfully!');
      setOtpVerified(true);
    } catch (err: unknown) {
      setOtpError(getSafeError(err, 'Invalid OTP'));
    } finally {
      setOtpSending(false);
    }
  }

  async function handleSubmitNIN() {
    if (!ninNumber.trim()) { setNinError('Enter your NIN'); return; }
    setNinSubmitting(true);
    setNinError('');
    setNinSuccess('');
    try {
      const { error: ninError } = await supabase
        .from('pro_profiles')
        .update({ nin_number: ninNumber, nin_status: 'pending' })
        .eq('user_id', user?.id);
      if (ninError) throw ninError;
      setNinSuccess('NIN verification submitted. Status will be updated once verified.');
      setNinSubmitted(true);
    } catch (err: unknown) {
      setNinError(getSafeError(err, 'NIN verification failed'));
    } finally {
      setNinSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/pro-connect" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-purple dark:text-neutral-500">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to directory
      </Link>

      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
        {existingProfile ? 'Edit Professional Profile' : 'Become a FRELUX Professional'}
      </h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
        Join the FRELUX Pro Connect network and connect with customers who need your services.
      </p>

      {/* Progress bar */}
      <div className="mb-8 mt-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className="flex items-center">
              <div className={classNames(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                s <= step ? 'bg-brand-purple text-white' : 'bg-neutral-200 text-neutral-400 dark:bg-white/5 dark:text-neutral-500'
              )}>
                {s < step ? <Check aria-hidden="true" className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div className={classNames('h-0.5 w-12 sm:w-20', s < step ? 'bg-brand-purple' : 'bg-neutral-200 dark:bg-white/5')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Identity */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Display Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or professional name"
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Optional company/business name"
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Professional Category *</label>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setSelectedServices([]); }}
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
            >
              <option value="">Select your category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your professional experience, specialties, and what makes you stand out..."
              rows={4}
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Years of Experience</label>
              <input
                type="number"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your contact phone"
                className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://your-website.com"
              className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
            />
          </div>
          <button
            onClick={handleStep1Submit}
            disabled={saving}
            className="w-full rounded-lg bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      )}

      {/* Step 2: Services */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Select Your Services</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-500">Choose all services you offer. You can update these anytime.</p>
          <div className="space-y-2">
            {filteredServices.map((s) => (
              <label key={s.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 cursor-pointer hover:border-brand-purple/30 dark:border-white/10 dark:hover:border-brand-purple-lighter/30">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedServices([...selectedServices, s.id]);
                    else setSelectedServices(selectedServices.filter((id) => id !== s.id));
                  }}
                  className="rounded border-neutral-300 text-brand-purple focus:ring-brand-purple"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-200">{s.name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300">
              Back
            </button>
            <button onClick={handleStep2Submit} disabled={saving} className="flex-1 rounded-lg bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Location & Availability */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Service Areas</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">Select the locations where you provide services.</p>
          </div>

          {states.map((state) => {
            const stateLocations = locations.filter((l) => l.state === state);
            const _selectedInState = selectedLocations.filter((id) =>
              stateLocations.some((l) => l.id === id)
            );
          return (
              <div key={state}>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">{state}</h3>
                <div className="flex flex-wrap gap-2">
                  {stateLocations.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        if (selectedLocations.includes(l.id)) {
                          setSelectedLocations(selectedLocations.filter((id) => id !== l.id));
                        } else {
                          setSelectedLocations([...selectedLocations, l.id]);
                        }
                      }}
                      className={classNames(
                        'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        selectedLocations.includes(l.id)
                          ? 'border-brand-purple bg-brand-purple text-white'
                          : 'border-neutral-200 text-neutral-600 hover:border-brand-purple/30 dark:border-white/10 dark:text-neutral-300'
                      )}
                    >
                      {[l.area, l.city].filter(Boolean).join(', ')}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Availability Status</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['available', 'busy', 'unavailable'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAvailability(a)}
                  className={classNames(
                    'rounded-lg border py-3 text-sm font-medium capitalize transition-colors',
                    availability === a
                      ? 'border-brand-purple bg-brand-purple text-white'
                      : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300">
              Back
            </button>
            <button onClick={handleStep3Submit} disabled={saving} className="flex-1 rounded-lg bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Mobile Number Verification */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/10">
              <Phone aria-hidden="true" className="h-8 w-8 text-brand-purple" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Mobile Number Verification</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              Verify your mobile number to unlock worker channels and increase trust.
            </p>
          </div>

          {otpVerified ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <Check aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{otpSuccess}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Mobile Number *</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy"
                  disabled={otpSent}
                />
              </div>

              {!otpSent ? (
                <button
                  onClick={handleSendOTP}
                  disabled={otpSending || !mobileNumber.trim()}
                  className="w-full rounded-lg bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {otpSending ? 'Sending...' : 'Send OTP Code'}
                </button>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Enter OTP Code *</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      maxLength={6}
                      className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-center text-lg tracking-widest dark:border-white/10 dark:bg-brand-navy"
                    />
                  </div>
                  {otpError && <p className="flex items-center gap-1.5 text-sm text-red-500"><AlertCircle aria-hidden="true" className="h-4 w-4" />{otpError}</p>}
                  {otpSuccess && <p className="text-sm text-emerald-500">{otpSuccess}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setOtpSent(false); setOtpCode(''); setOtpError(''); }}
                      className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300"
                    >
                      Change Number
                    </button>
                    <button
                      onClick={handleVerifyOTP}
                      disabled={otpSending || otpCode.length !== 6}
                      className="flex-1 rounded-lg bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {otpSending ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                  <button
                    onClick={handleSendOTP}
                    disabled={otpSending || resendCooldown > 0}
                    className={`w-full text-center text-xs ${resendCooldown > 0 ? 'text-neutral-500' : 'text-brand-purple hover:underline'}`}
                  >
                    {resendCooldown > 0
                      ? `Resend OTP in ${resendCooldown}s`
                      : otpSending ? 'Sending...' : 'Resend OTP'}
                  </button>
                </>
              )}
              {otpError && !otpSent && <p className="flex items-center gap-1.5 text-sm text-red-500"><AlertCircle aria-hidden="true" className="h-4 w-4" />{otpError}</p>}
            </>
          )}

          <div className="border-t border-neutral-200 pt-4 dark:border-white/10">
            <button
              onClick={() => setStep(5)}
              className="text-sm text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Skip for now →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: NIN KYC Verification */}
      {step === 5 && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/10">
              <Shield aria-hidden="true" className="h-8 w-8 text-brand-purple" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">NIN Verification (KYC)</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              Enter your National Identification Number (NIN) to verify your identity. This is required to access Worker Channels.
            </p>
          </div>

          {ninSubmitted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <Check aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{ninSuccess}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  National Identification Number (NIN) *
                </label>
                <input
                  type="text"
                  value={ninNumber}
                  onChange={(e) => setNinNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="11-digit NIN"
                  maxLength={11}
                  className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-center text-lg tracking-widest dark:border-white/10 dark:bg-brand-navy"
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  Your NIN is stored securely and only visible to FRELUX administrators for verification.
                </p>
              </div>

              {ninError && <p className="flex items-center gap-1.5 text-sm text-red-500"><AlertCircle aria-hidden="true" className="h-4 w-4" />{ninError}</p>}
              {ninSuccess && <p className="text-sm text-emerald-500">{ninSuccess}</p>}

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  After submitting, an admin will verify your NIN. Once approved, you'll reach <strong>Tier 2 (FRELUX Verified)</strong> and can join Worker Channels.
                </p>
              </div>

              <button
                onClick={handleSubmitNIN}
                disabled={ninSubmitting || ninNumber.length !== 11}
                className="w-full rounded-lg bg-brand-purple py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {ninSubmitting ? 'Submitting...' : 'Submit NIN for Verification'}
              </button>
            </>
          )}

          <div className="border-t border-neutral-200 pt-4 dark:border-white/10">
            <button
              onClick={() => setStep(6)}
              className="text-sm text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Skip for now →
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Done */}
      {step === 6 && (
        <div className="text-center py-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
            <Check aria-hidden="true" className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Profile Created!</h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-500">
            Your professional profile is now live on FRELUX Pro Connect. Customers can find you in the directory.
          </p>
          {(otpVerified || ninSubmitted) && (
            <div className="mt-4 rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-3 text-sm">
              {otpVerified && <p className="text-emerald-500">✓ Mobile number verified</p>}
              {ninSubmitted && <p className="text-amber-500">⏳ NIN submitted — pending admin verification</p>}
              {!ninSubmitted && (
                <p className="text-neutral-500 dark:text-neutral-500">
                  Complete NIN verification to unlock Worker Channels (Tier 2 access).
                </p>
              )}
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to={`/pro-connect/${slug}`}
              className="rounded-lg bg-brand-purple py-3 text-sm font-semibold text-white"
            >
              View My Profile
            </Link>
            <Link
              to="/pro-connect/dashboard"
              className="rounded-lg border border-neutral-200 py-3 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300"
            >
              Go to Dashboard
            </Link>
            {otpVerified && ninSubmitted && (
              <Link
                to="/worker-channels"
                className="rounded-lg border border-brand-purple/30 py-3 text-sm font-semibold text-brand-purple"
              >
                Join Worker Channels →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
