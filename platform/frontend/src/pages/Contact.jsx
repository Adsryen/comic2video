import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CTASection from '../components/home/CTASection';
import { useSiteText } from '../context/siteText';

const Contact = () => {
  const text = useSiteText();
  const faqData = [
    { q: text.faqConvertQuestion, a: text.faqConvertAnswer },
    { q: text.faqFormatsQuestion, a: text.faqFormatsAnswer },
    { q: text.faqPreviewQuestion, a: text.faqPreviewAnswer },
    { q: text.faqLimitQuestion, a: text.faqLimitAnswer },
    { q: text.faqInstallQuestion, a: text.faqInstallAnswer },
    { q: text.faqSafetyQuestion, a: text.faqSafetyAnswer },
  ];

  const developers = [
    {
      name: 'Adsryen',
      role: text.developerFrontendRole,
      img: '/manhwa-logo.png',
      linkedin: 'https://github.com/Adsryen',
      github: 'https://github.com/Adsryen/comic2video',
    },
  ];

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = text.contactNameRequired;
    if (!form.email.trim()) err.email = text.contactEmailRequired;
    else if (!/^\S+@\S+$/i.test(form.email)) err.email = text.contactEmailInvalid;
    if (!form.message.trim()) err.message = text.contactMessageRequired;
    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    if (Object.keys(err).length) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
          name: form.name,
          email: form.email,
          message: form.message,
          subject: text.contactMessageSubject,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setForm({ name: '', email: '', message: '' });
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setErrorMessage(result.message || text.contactSendFailed);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setErrorMessage(text.contactSendRetry);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-0 py-20 lg:py-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 lg:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-4xl font-bold text-white mb-3">{text.contactTitle}</h1>
          <p className="text-gray-400 text-base">{text.contactSubtitle}</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <motion.form initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 space-y-4">
            <div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={text.locale === 'zh' ? '你的姓名' : 'Your name'} className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none" />
              {errors.name ? <p className="mt-2 text-sm text-red-300">{errors.name}</p> : null}
            </div>
            <div>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={text.emailPlaceholder} className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none" />
              {errors.email ? <p className="mt-2 text-sm text-red-300">{errors.email}</p> : null}
            </div>
            <div>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={text.locale === 'zh' ? '请输入你的问题、需求或合作想法' : 'Tell us what you need, what is blocked, or how you want to collaborate'} rows={6} className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none" />
              {errors.message ? <p className="mt-2 text-sm text-red-300">{errors.message}</p> : null}
            </div>
            {success ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{text.locale === 'zh' ? '消息发送成功，我们会尽快联系你。' : 'Message sent successfully. We will get back to you soon.'}</div> : null}
            {errorMessage ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</div> : null}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-50">
              {loading ? text.sending : text.contactTitle}
            </button>
          </motion.form>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            {faqData.map((item, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-5 text-left flex justify-between items-center hover:bg-white/5 transition-colors">
                  <p className="font-semibold text-lg pr-4">{item.q}</p>
                  <motion.svg animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }} className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>
                <motion.div initial={false} animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                  <p className="text-gray-400 text-sm px-5 pb-5">{item.a}</p>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div className="mt-30" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="text-3xl font-bold text-center mb-2">{text.meetDevelopers}</h2>
          <p className="text-gray-400 text-center mb-15">{text.collaborationNote}</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {developers.map((dev, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 text-center">
                <img src={dev.img} alt={dev.name} className="w-24 h-24 mx-auto rounded-full mb-4 border-3 border-gray-700 object-cover" />
                <h3 className="text-xl font-bold mb-1">{dev.name}</h3>
                <p className="text-gray-400 mb-4">{dev.role}</p>
                <div className="flex justify-center gap-4">
                  <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 fill-current text-blue-400 hover:text-blue-300" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </a>
                  <a href={dev.github} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 fill-current text-gray-400 hover:text-gray-300" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-10">
          <CTASection />
        </div>
      </div>
    </div>
  );
};

export default Contact;
