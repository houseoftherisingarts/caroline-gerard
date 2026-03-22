import React, { useState, useEffect, useRef } from 'react';
import { Users, Mail, Send, Trash2, UserCheck, MessageSquare, ArrowLeft } from 'lucide-react';
import {
  subscribeToMembers,
  subscribeToSubscribers,
  subscribeToAllMessages,
  sendCommunityMessage,
  markMessageRead,
  deleteCommunityMessage,
  deleteSubscriber,
  deleteMember,
} from '../../lib/firestore';
import { Member, Subscriber, CommunityMessage } from '../../types';

type Tab = 'messages' | 'membres' | 'abonnes' | 'infolettre';

const TabButton = ({
  id, label, icon, active, badge, onClick,
}: { id: Tab; label: string; icon: React.ReactNode; active: boolean; badge?: number; onClick: (t: Tab) => void }) => (
  <button
    onClick={() => onClick(id)}
    className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
      active ? 'bg-gold text-midnight shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'
    }`}
  >
    {icon} {label}
    {!!badge && (
      <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

// ─── Chat bubble (admin side) ─────────────────────────────────────────────────

const Bubble = ({ msg, onDelete }: { msg: CommunityMessage; onDelete: (id: string) => void }) => {
  const isCaroline = msg.direction === 'from_caroline';
  return (
    <div className={`flex ${isCaroline ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`relative max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isCaroline ? 'bg-gold text-midnight rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
      }`}>
        {!isCaroline && <p className="text-xs font-bold text-gold mb-1">{msg.memberName}</p>}
        {msg.body}
        <p className={`text-[10px] mt-1 ${isCaroline ? 'text-midnight/60 text-right' : 'text-slate-500'}`}>
          {new Date(msg.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {!isCaroline && (msg.read ? ' · Lu ✓' : ' · Non lu')}
        </p>
        <button
          onClick={() => { if (confirm('Supprimer ce message?')) onDelete(msg.id); }}
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500/90 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-opacity"
          title="Supprimer"
        >×</button>
      </div>
    </div>
  );
};

// ─── Admin Communauté ─────────────────────────────────────────────────────────

const AdminCommunaute = () => {
  const [tab, setTab] = useState<Tab>('messages');
  const [members, setMembers] = useState<Member[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [allMessages, setAllMessages] = useState<CommunityMessage[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replySending, setReplySending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Broadcast form
  const [broadcastTo, setBroadcastTo] = useState<'all_members' | 'all_subscribers'>('all_members');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [broadcastError, setBroadcastError] = useState('');

  useEffect(() => {
    const unsubs = [
      subscribeToMembers(ms => setMembers(ms.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()))),
      subscribeToSubscribers(ss => setSubscribers(ss.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()))),
      subscribeToAllMessages(msgs => {
        setAllMessages(msgs);
        // Mark messages as read when admin has selected this member's thread
        // (handled below in selectedThread)
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Auto-scroll when messages update in selected thread
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedMemberId]);

  // Mark selected thread's member messages as read when admin opens them
  useEffect(() => {
    if (!selectedMemberId) return;
    allMessages
      .filter(m => m.memberId === selectedMemberId && m.direction === 'from_member' && !m.read)
      .forEach(m => markMessageRead(m.id));
  }, [selectedMemberId, allMessages]);

  // Build thread list: one entry per member who has messages
  const threads = React.useMemo(() => {
    const map = new Map<string, { member: Member | null; messages: CommunityMessage[]; unread: number; lastAt: string }>();
    allMessages.forEach(msg => {
      if (!map.has(msg.memberId)) {
        map.set(msg.memberId, {
          member: members.find(m => m.id === msg.memberId) ?? null,
          messages: [],
          unread: 0,
          lastAt: msg.createdAt,
        });
      }
      const thread = map.get(msg.memberId)!;
      thread.messages.push(msg);
      if (msg.createdAt > thread.lastAt) thread.lastAt = msg.createdAt;
      if (msg.direction === 'from_member' && !msg.read) thread.unread++;
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [allMessages, members]);

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);
  const selectedThread = selectedMemberId ? threads.find(t => t.messages[0]?.memberId === selectedMemberId) : null;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedMemberId) return;
    setReplySending(true);
    const thread = threads.find(t => t.messages[0]?.memberId === selectedMemberId);
    const msg: CommunityMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      memberId: selectedMemberId,
      memberEmail: thread?.messages[0]?.memberEmail ?? '',
      memberName: thread?.messages[0]?.memberName ?? '',
      direction: 'from_caroline',
      body: reply.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    await sendCommunityMessage(msg);
    setReply('');
    setReplySending(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return;
    setBroadcastStatus('sending');
    setBroadcastError('');
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'northamerica-northeast1'), 'sendDirectMessage');
      const recipients = broadcastTo === 'all_members'
        ? members.map(m => m.email).filter(Boolean)
        : subscribers.map(s => s.email).filter(Boolean);
      await fn({ recipients, subject: broadcastSubject, body: broadcastBody });
      setBroadcastStatus('sent');
      setBroadcastSubject('');
      setBroadcastBody('');
      setTimeout(() => setBroadcastStatus('idle'), 4000);
    } catch (err: unknown) {
      setBroadcastStatus('error');
      setBroadcastError((err as Error).message ?? 'Erreur lors de l\'envoi.');
    }
  };

  // ── Conversation panel (right side of messages tab) ───────────────────────

  const ConversationPanel = () => {
    if (!selectedThread) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-600 p-12">
          <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
          <p>Sélectionnez une conversation à gauche.</p>
        </div>
      );
    }

    const info = selectedThread.messages[0];
    const memberProfile = selectedThread.member;
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Thread header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 shrink-0">
          <button onClick={() => setSelectedMemberId(null)} className="md:hidden text-slate-400 hover:text-white mr-2">
            <ArrowLeft size={18} />
          </button>
          {memberProfile?.photoURL
            ? <img src={memberProfile.photoURL} alt="" className="w-9 h-9 rounded-full border border-gold/30" />
            : <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center"><Users size={16} className="text-gold" /></div>
          }
          <div>
            <p className="text-white font-bold text-sm">{info.memberName}</p>
            <p className="text-slate-500 text-xs">{info.memberEmail}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {selectedThread.messages.map(msg => (
            <React.Fragment key={msg.id}>
              <Bubble msg={msg} onDelete={deleteCommunityMessage} />
            </React.Fragment>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Reply box */}
        <form onSubmit={handleReply} className="px-4 py-4 border-t border-white/10 flex gap-3 shrink-0">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e as unknown as React.FormEvent); } }}
            placeholder="Votre réponse… (Entrée pour envoyer)"
            rows={2}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors resize-none text-sm"
          />
          <button
            type="submit"
            disabled={replySending || !reply.trim()}
            className="px-4 py-3 bg-gold text-midnight rounded-xl hover:bg-white transition-colors disabled:opacity-40 shrink-0 self-end"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white">Communauté</h1>
        <p className="text-slate-400 mt-1">Messagerie, membres, abonnés et infolettre</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap p-2 bg-midnight/60 rounded-xl border border-white/10 w-fit">
        <TabButton id="messages" label="Messages" icon={<MessageSquare size={16} />} active={tab === 'messages'} badge={totalUnread} onClick={setTab} />
        <TabButton id="membres" label={`Membres (${members.length})`} icon={<UserCheck size={16} />} active={tab === 'membres'} onClick={setTab} />
        <TabButton id="abonnes" label={`Abonnés (${subscribers.length})`} icon={<Mail size={16} />} active={tab === 'abonnes'} onClick={setTab} />
        <TabButton id="infolettre" label="Envoyer un message" icon={<Send size={16} />} active={tab === 'infolettre'} onClick={setTab} />
      </div>

      {/* ── Messages ── */}
      {tab === 'messages' && (
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-lg flex" style={{ height: '70vh' }}>
          {/* Thread list */}
          <div className={`w-full md:w-72 border-r border-white/10 flex flex-col shrink-0 ${selectedMemberId ? 'hidden md:flex' : 'flex'}`}>
            <div className="px-4 py-4 border-b border-white/10">
              <p className="text-white font-bold text-sm">Conversations</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {threads.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-12">Aucun message reçu.</p>
              ) : threads.map(t => {
                const info = t.messages[0];
                const isSelected = selectedMemberId === info.memberId;
                return (
                  <button
                    key={info.memberId}
                    onClick={() => setSelectedMemberId(info.memberId)}
                    className={`w-full px-4 py-4 text-left flex items-center gap-3 border-b border-white/5 transition-colors ${isSelected ? 'bg-gold/10 border-l-2 border-l-gold' : 'hover:bg-white/5'}`}
                  >
                    {t.member?.photoURL
                      ? <img src={t.member.photoURL} alt="" className="w-9 h-9 rounded-full shrink-0 border border-white/10" />
                      : <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Users size={14} className="text-slate-400" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white truncate">{info.memberName}</p>
                        {t.unread > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{t.unread}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {t.messages[t.messages.length - 1]?.body}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${selectedMemberId ? 'flex' : 'hidden md:flex'}`}>
            <ConversationPanel />
          </div>
        </div>
      )}

      {/* ── Membres ── */}
      {tab === 'membres' && (
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
            <Users className="text-gold" size={20} />
            <h3 className="text-xl font-bold text-white">Membres de la communauté</h3>
          </div>
          {members.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-600 text-sm">Aucun membre pour le moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-400">
                <thead className="bg-white/5 text-white uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left">Membre</th>
                    <th className="px-6 py-3 text-left">Courriel</th>
                    <th className="px-6 py-3 text-left">Connexion</th>
                    <th className="px-6 py-3 text-left">Depuis</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {m.photoURL
                            ? <img src={m.photoURL} alt="" className="w-8 h-8 rounded-full" />
                            : <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center"><Users size={14} className="text-gold" /></div>
                          }
                          <span className="font-bold text-white">{m.displayName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{m.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.provider === 'google' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                          {m.provider === 'google' ? 'Google' : 'Courriel'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{new Date(m.joinedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setTab('messages'); setSelectedMemberId(m.id); }}
                            className="p-2 bg-gold/10 text-gold hover:bg-gold hover:text-midnight rounded-lg transition-colors"
                            title="Ouvrir la conversation"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Supprimer ce membre?')) deleteMember(m.id); }}
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Abonnés ── */}
      {tab === 'abonnes' && (
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
            <Mail className="text-gold" size={20} />
            <h3 className="text-xl font-bold text-white">Abonnés à l'infolettre</h3>
          </div>
          {subscribers.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-600 text-sm">Aucun abonné pour le moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-400">
                <thead className="bg-white/5 text-white uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left">Courriel</th>
                    <th className="px-6 py-3 text-left">Abonné depuis</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subscribers.map(s => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{s.email}</td>
                      <td className="px-6 py-4 text-xs">{new Date(s.subscribedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => { if (confirm('Désabonner ce contact?')) deleteSubscriber(s.id); }}
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Infolettre / Broadcast ── */}
      {tab === 'infolettre' && (
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-8 shadow-lg max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Send className="text-gold" size={20} />
            <h3 className="text-xl font-bold text-white">Envoyer un courriel groupé</h3>
          </div>
          {broadcastStatus === 'sent' ? (
            <div className="text-center py-10">
              <div className="text-green-400 text-5xl mb-4">✓</div>
              <p className="text-white font-bold">Message envoyé avec succès!</p>
            </div>
          ) : (
            <form onSubmit={handleBroadcast} className="space-y-5">
              <div>
                <label className="text-slate-400 text-sm font-bold uppercase tracking-wider block mb-2">Destinataires</label>
                <select
                  value={broadcastTo}
                  onChange={e => setBroadcastTo(e.target.value as 'all_members' | 'all_subscribers')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="all_members">Tous les membres ({members.length})</option>
                  <option value="all_subscribers">Tous les abonnés ({subscribers.length})</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm font-bold uppercase tracking-wider block mb-2">Sujet</label>
                <input
                  type="text"
                  value={broadcastSubject}
                  onChange={e => setBroadcastSubject(e.target.value)}
                  placeholder="Sujet du courriel"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm font-bold uppercase tracking-wider block mb-2">Message</label>
                <textarea
                  value={broadcastBody}
                  onChange={e => setBroadcastBody(e.target.value)}
                  placeholder="Votre message..."
                  required
                  rows={8}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors resize-none"
                />
              </div>
              {broadcastError && <p className="text-red-400 text-sm">{broadcastError}</p>}
              <button
                type="submit"
                disabled={broadcastStatus === 'sending'}
                className="flex items-center gap-2 px-8 py-3 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-50"
              >
                <Send size={16} />
                {broadcastStatus === 'sending' ? 'Envoi en cours...' : 'Envoyer'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCommunaute;
