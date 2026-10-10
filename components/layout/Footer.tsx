'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Gamepad2,
    ShieldCheck,
    Headphones,
    Heart,
    Zap,
    Lock,
    Sparkles,
    Send,
    PhoneCall,
    Mail,
    MessageCircle,
    MapPin,
    Award,
    CheckCircle2,
    Globe,
    HelpCircle,
    FileText,
    BadgeCheck,
    RefreshCw,
    Coins,
    ShieldAlert,
    ArrowRight,
    ExternalLink,
    QrCode,
} from 'lucide-react';
import { App, Modal } from 'antd';
import { useSettings } from '@/components/settings/SettingsProvider';

type PolicyTopic = 'guide' | 'warranty' | 'refund' | 'pricing' | 'terms' | 'privacy' | 'faq' | null;

interface GameCategoryItem {
    id: string;
    name: string;
    slug: string;
    accountsCount?: number;
}

interface FooterProps {
    games?: GameCategoryItem[];
}

export default function Footer({ games: customGames }: FooterProps = {}) {
    const { message } = App.useApp();
    const { settings } = useSettings();
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [activePolicy, setActivePolicy] = useState<PolicyTopic>(null);
    const [games, setGames] = useState<GameCategoryItem[]>(customGames || []);

    // Chỉ fetch live games nếu không được truyền từ Server Component
    useEffect(() => {
        if (customGames && customGames.length > 0) {
            setGames(customGames);
            return;
        }
        let isMounted = true;
        async function loadGames() {
            try {
                const res = await fetch('/api/games');
                const data = await res.json();
                if (isMounted && data.success && Array.isArray(data.games) && data.games.length > 0) {
                    setGames(data.games);
                }
            } catch {
                // Fallback to static if offline
            }
        }
        loadGames();
        return () => {
            isMounted = false;
        };
    }, [customGames]);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail || !newsletterEmail.includes('@')) {
            message.warning('Vui lòng nhập địa chỉ email hợp lệ!');
            return;
        }
        message.success('Đăng ký nhận ưu đãi thành công! Mã giảm giá 10% đã gửi vào hộp thư của bạn.');
        setNewsletterEmail('');
    };

    // CỔNG THANH TOÁN TỰ ĐỘNG: CHỈ DÙNG SEPAY VÀ CÁC ĐỐI TÁC NGÂN HÀNG SEPAY
    const sepayPaymentMethods = [
        {
            name: 'VietQR SePay',
            desc: 'Quét mã chuẩn Napas 3s',
            color: 'from-emerald-700/25 to-teal-600/20 border-emerald-500/30 text-emerald-300',
        },
        {
            name: 'MB Bank Auto',
            desc: 'Duyệt lệnh SePay 24/7',
            color: 'from-blue-700/25 to-indigo-600/20 border-blue-500/30 text-blue-300',
        },
        {
            name: 'Vietcombank',
            desc: 'Khớp số dư tự động',
            color: 'from-cyan-700/25 to-teal-600/20 border-cyan-500/30 text-cyan-300',
        },
        {
            name: 'ACB / BIDV / Tech',
            desc: 'Bàn giao nick tức thì',
            color: 'from-purple-700/25 to-pink-600/20 border-purple-500/30 text-purple-300',
        },
    ];

    const highlights = [
        {
            icon: <Zap className="w-5 h-5 text-amber-400" />,
            title: 'Giao Dịch Tự Động 24/7',
            desc: 'Nhận tài khoản & mật khẩu tức thì trong 3 giây sau khi thanh toán qua SePay',
        },
        {
            icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
            title: 'Bảo Hành Uy Tín 100%',
            desc: 'Cam kết thông tin sạch, đổi trả 1-1 trong lúc bên shop đang giữ acc',
        },
        {
            icon: <Lock className="w-5 h-5 text-rose-400" />,
            title: 'Bảo Mật SSL 256-Bit',
            desc: 'Mã hóa tuyệt đối toàn bộ lịch sử đơn hàng & thông tin tài khoản người dùng',
        },
        {
            icon: <Headphones className="w-5 h-5 text-purple-400" />,
            title: 'Hỗ Trợ Tận Tâm 24/7',
            desc: 'Đội ngũ CSKH qua Zalo & Hotline 24/7',
        },
    ];

    // Social link helpers
    const socialLinks = [
        {
            name: 'Facebook',
            url: settings.social?.facebook,
            icon: (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            ),
        },
        {
            name: 'YouTube',
            url: settings.social?.youtube,
            icon: (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            ),
        },
        { name: 'TikTok', url: settings.social?.tiktok, icon: <Globe className="w-4 h-4" /> },
        { name: 'Telegram', url: settings.social?.telegram, icon: <Send className="w-4 h-4" /> },
        {
            name: 'Zalo',
            url: settings.social?.zalo
                ? settings.social.zalo.startsWith('http')
                    ? settings.social.zalo
                    : `https://zalo.me/${settings.social.zalo.replace(/\D/g, '')}`
                : '',
            icon: <MessageCircle className="w-4 h-4" />,
        },
    ].filter((item) => item.url && item.url.trim() !== '');

    // Dynamic Kho Nick List
    const displayedGames =
        games.length > 0
            ? games.slice(0, 7)
            : [
                  { id: 'lien-quan-mobile', name: 'Liên Quân Mobile VIP', slug: 'lien-quan-mobile' },
                  { id: 'valorant', name: 'Valorant Radiant / APAC', slug: 'valorant' },
                  { id: 'free-fire', name: 'Free Fire Quỷ Dạ Xoa', slug: 'free-fire' },
                  { id: 'pubg-mobile', name: 'PUBG Mobile M416 Băng Tuyết', slug: 'pubg-mobile' },
                  { id: 'fc-online', name: 'FC Online Đội Hình Khủng', slug: 'fc-online' },
                  { id: 'toc-chien', name: 'Tốc Chiến Thách Đấu VIP', slug: 'toc-chien' },
                  { id: 'genshin-impact', name: 'Genshin Impact AR 60+', slug: 'genshin-impact' },
              ];

    // Policy Modal Content Renderer
    const policyDetails: Record<string, { title: string; icon: React.ReactNode; content: React.ReactNode }> = {
        guide: {
            title: 'Hướng Dẫn Mua Nick 3 Bước Tự Động',
            icon: <BadgeCheck className="w-5 h-5 text-emerald-400" />,
            content: (
                <div className="space-y-4 text-xs sm:text-sm text-pink-100/80 leading-relaxed">
                    <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0">
                            1
                        </div>
                        <div>
                            <div className="font-bold text-white mb-0.5">Nạp Tiền Vào Ví</div>
                            <p className="text-pink-200/60 text-xs">
                                Đăng nhập tài khoản, bấm nút <strong>&quot;Nạp Tiền&quot;</strong> và quét mã{' '}
                                <strong>VietQR SePay</strong>. Hệ thống tự động cộng tiền vào ví trong vòng 3 giây không
                                mất phí.
                            </p>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center shrink-0">
                            2
                        </div>
                        <div>
                            <div className="font-bold text-white mb-0.5">Chọn Nick Game Ưng Ý</div>
                            <p className="text-pink-200/60 text-xs">
                                Duyệt kho tài khoản Liên Quân, Valorant, Free Fire... Sử dụng bộ lọc theo tướng, trang
                                phục, rank hoặc tầm giá phù hợp.
                            </p>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center shrink-0">
                            3
                        </div>
                        <div>
                            <div className="font-bold text-white mb-0.5">Nhận Tài Khoản Tức Thì</div>
                            <p className="text-pink-200/60 text-xs">
                                Bấm <strong>&quot;Mua Ngay&quot;</strong>, hệ thống tự động trừ ví và bàn giao Tên đăng
                                nhập + Mật khẩu ngay trên màn hình và lưu vĩnh viễn trong{' '}
                                <strong>Trang Cá Nhân &gt; Lịch Sử Đơn Hàng</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            ),
        },
        warranty: {
            title: 'Chính Sách Bảo Hành Uy Tín',
            icon: <ShieldCheck className="w-5 h-5 text-rose-400" />,
            content: (
                <div className="space-y-3.5 text-xs sm:text-sm text-pink-100/80 leading-relaxed">
                    <p>
                        Tất cả tài khoản bán ra tại shop đều được kiểm duyệt nghiêm ngặt, đảm bảo thông tin trắng sạch
                        100% trước khi giao dịch.
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-pink-200/70 text-xs">
                        <li>
                            <strong>Bảo hành 1 đổi 1 hoặc hoàn tiền 100%:</strong> Áp dụng nếu tài khoản sai mật khẩu,
                            bị tranh chấp hoặc có lỗi phát sinh từ thời điểm trước khi mua.
                        </li>
                        <li>
                            <strong>Thời hạn bảo hành:</strong> Trong thời gian bên shop giữ acc.
                        </li>
                        <li>
                            <strong>Hỗ trợ đổi thông tin:</strong> Hướng dẫn khách hàng liên kết số điện thoại, email
                            chính chủ và bật bảo mật 2 lớp an toàn tuyệt đối.
                        </li>
                    </ul>
                </div>
            ),
        },
        refund: {
            title: 'Quy Trình Đổi Trả & Hoàn Tiền',
            icon: <RefreshCw className="w-5 h-5 text-cyan-400" />,
            content: (
                <div className="space-y-3 text-xs sm:text-sm text-pink-100/80 leading-relaxed">
                    <p>
                        Nếu quý khách gặp bất kỳ trở ngại nào trong quá trình nhận và sử dụng tài khoản, quy trình xử lý
                        hoàn tiền diễn ra như sau:
                    </p>
                    <div className="space-y-2 text-xs text-pink-200/70">
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <strong className="text-white block mb-1">Bước 1: Gửi yêu cầu hỗ trợ</strong>
                            Liên hệ qua Hotline hoặc Zalo CSKH, cung cấp <strong>Mã đơn hàng (#DHxxxxx)</strong> và hình
                            ảnh lỗi.
                        </div>
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <strong className="text-white block mb-1">Bước 2: Kỹ thuật đối soát</strong>
                            Đội ngũ kỹ thuật kiểm tra nhật ký tài khoản trong vòng 5 - 15 phút.
                        </div>
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <strong className="text-white block mb-1">Bước 3: Hoàn tiền ví tức thì</strong>
                            Sau khi xác nhận, toàn bộ số tiền đơn hàng sẽ được hoàn 100% vào số dư ví của quý khách để
                            mua tài khoản khác.
                        </div>
                    </div>
                </div>
            ),
        },
        pricing: {
            title: 'Bảng Giá Nạp Ví & Chiết Khấu SePay',
            icon: <Coins className="w-5 h-5 text-amber-400" />,
            content: (
                <div className="space-y-3.5 text-xs sm:text-sm text-pink-100/80 leading-relaxed">
                    <p>
                        Shop áp dụng tỷ giá nạp tiền tự động qua cổng <strong>SePay VietQR</strong> ưu đãi 1:1, hoàn
                        toàn miễn phí:
                    </p>
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-teal-950/20 border border-emerald-500/20">
                        <div className="flex items-center justify-between text-xs py-1 border-b border-white/10">
                            <span className="text-pink-200/70">Cổng thanh toán:</span>
                            <span className="font-bold text-emerald-400">VietQR SePay (Auto 24/7)</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1 border-b border-white/10">
                            <span className="text-pink-200/70">Tỷ lệ quy đổi:</span>
                            <span className="font-bold text-white">100.000 VNĐ = 100.000 VNĐ Ví</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-pink-200/70">Phí giao dịch:</span>
                            <span className="font-bold text-emerald-400">0đ (Miễn phí 100%)</span>
                        </div>
                    </div>
                    <p className="text-xs text-pink-300/60">
                        * .
                    </p>
                </div>
            ),
        },
        terms: {
            title: 'Điều Khoản Sử Dụng Dịch Vụ',
            icon: <FileText className="w-5 h-5 text-purple-400" />,
            content: (
                <div className="space-y-3 text-xs sm:text-sm text-pink-100/80 leading-relaxed">
                    <p>Khi tham gia giao dịch trên sàn, quý khách đồng ý tuân thủ các quy tắc sau:</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-pink-200/70">
                        <li>
                            Quý khách có trách nhiệm đổi mật khẩu và liên kết thông tin cá nhân ngay sau khi nhận nick.
                        </li>
                        <li>
                            Nghiêm cấm sử dụng tài khoản mua tại shop để thực hiện các hành vi gian lận (hack/cheat) gây
                            khóa acc.
                        </li>
                        <li>
                            Mọi tranh chấp phát sinh sẽ được giải quyết căn cứ trên lịch sử hệ thống của shop và đối
                            soát SePay.
                        </li>
                    </ul>
                </div>
            ),
        },
        privacy: {
            title: 'Chính Sách Bảo Mật Thông Tin',
            icon: <Lock className="w-5 h-5 text-rose-400" />,
            content: (
                <div className="space-y-3 text-xs sm:text-sm text-pink-100/80 leading-relaxed">
                    <p>Chúng tôi cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của mọi khách hàng:</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-pink-200/70">
                        <li>
                            Toàn bộ thông tin tài khoản, đơn hàng và lịch sử thanh toán được mã hóa chuẩn{' '}
                            <strong>SSL 256-Bit</strong>.
                        </li>
                        <li>
                            Tuyệt đối không tiết lộ số điện thoại, email hay thông tin tài khoản cho bất kỳ bên thứ ba
                            nào.
                        </li>
                        <li>Hệ thống lưu trữ độc lập trên hạ tầng đám mây bảo mật cao cấp.</li>
                    </ul>
                </div>
            ),
        },
    };

    const handlePolicyClick = (topic: PolicyTopic) => {
        if (topic === 'faq') {
            const faqElem = document.getElementById('faq');
            if (faqElem) {
                faqElem.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.href = '/#faq';
            }
            return;
        }
        setActivePolicy(topic);
    };

    return (
        <footer className="w-full mt-10 rounded-[32px] bg-gradient-to-b from-[#180817]/95 via-[#130512]/98 to-[#0b030a] border border-white/10 shadow-2xl text-pink-100/70 relative overflow-hidden">
            {/* Background Decorative Glows */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -right-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-6">
                {/* ── TOP BANNER: NEWSLETTER & VIP PERKS ── */}
                <div className="mb-10 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-pink-950/40 border border-rose-500/20 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="max-w-xl text-center lg:text-left">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                            <span>Ưu Đãi Độc Quyền Dành Cho Thành Viên</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                            Đăng ký nhận thông báo Flash Sale & Giftcode VIP
                        </h3>
                    </div>

                    <form
                        onSubmit={handleSubscribe}
                        className="w-full sm:w-auto flex-1 max-w-md flex items-center gap-2"
                    >
                        <input
                            type="email"
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            placeholder="Nhập email của bạn (vd: game@gmail.com)..."
                            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs sm:text-sm placeholder-pink-300/30 focus:outline-none focus:border-rose-500/60 transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-purple-700 hover:from-rose-500 hover:to-purple-600 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-rose-900/40 flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Đăng Ký</span>
                        </button>
                    </form>
                </div>

                {/* ── 4 KEY TRUST HIGHLIGHTS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-10 border-b border-white/8">
                    {highlights.map((item, idx) => (
                        <div
                            key={idx}
                            className="p-4 rounded-2xl bg-[#200d1e]/50 border border-white/5 hover:border-rose-500/25 transition-all duration-300 flex items-start gap-3.5 group hover:bg-[#200d1e]/80"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-[11px] text-pink-200/50 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── MAIN 4-COLUMN FOOTER CONTENT ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 py-10 border-b border-white/8">
                    {/* Col 1: Brand & Contact Info (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <Link href="/" className="flex items-center gap-3">
                            {settings.logo?.url ? (
                                <div className="relative h-11 w-auto max-w-[160px] flex items-center">
                                    <Image
                                        src={settings.logo.url}
                                        alt={settings.brandName || settings.siteName || 'Logo'}
                                        width={140}
                                        height={44}
                                        className="object-contain h-10 w-auto"
                                    />
                                </div>
                            ) : (
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-600/30 ring-1 ring-white/20 shrink-0">
                                    <Gamepad2 className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 leading-none">
                                    <span className="text-white font-black text-xl tracking-tight">
                                        {settings.brandName || settings.siteName || 'GameStore'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-pink-300/60 font-semibold tracking-widest uppercase mt-0.5">
                                    {settings.siteDescription
                                        ? settings.siteDescription.slice(0, 45) + '...'
                                        : 'Marketplace Nick Game VIP #1 VN'}
                                </span>
                            </div>
                        </Link>

                        <p className="text-xs text-pink-200/60 leading-relaxed max-w-sm">
                            {settings.footer?.description ||
                                'Sàn thương mại điện tử chuyên cung cấp tài khoản, nick game bản quyền uy tín hàng đầu. Hệ thống duyệt đơn tự động 24/7 qua cổng SePay, bảo mật thông tin tuyệt đối và cam kết bảo hành đổi trả minh bạch.'}
                        </p>

                        {/* Quick Contact Chips with Full Clickable Actions */}
                        <div className="flex flex-col gap-2 pt-2">
                            {settings.contact?.phone && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                        <PhoneCall className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-pink-200/70">Hotline CSKH:</span>
                                    <a
                                        href={`tel:${settings.contact.phone.replace(/\s+/g, '')}`}
                                        className="font-bold text-white hover:text-emerald-400 transition-colors underline-offset-2 hover:underline"
                                    >
                                        {settings.contact.phone}
                                    </a>
                                    <span className="text-[10px] text-emerald-400 font-medium">(8h00 - 24h00)</span>
                                </div>
                            )}

                            {settings.contact?.zalo && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                        <MessageCircle className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-pink-200/70">Hỗ trợ Zalo:</span>
                                    <a
                                        href={`https://zalo.me/${settings.contact.zalo.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-rose-300 hover:text-rose-200 transition-colors underline-offset-2 hover:underline"
                                    >
                                        {settings.contact.zalo}
                                    </a>
                                    <span className="text-[10px] text-rose-400 font-medium">(24/7)</span>
                                </div>
                            )}

                            {settings.contact?.email && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                                        <Mail className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-pink-200/70">Email hỗ trợ:</span>
                                    <a
                                        href={`mailto:${settings.contact.email}`}
                                        className="font-medium text-purple-300 hover:text-purple-200 transition-colors underline-offset-2 hover:underline"
                                    >
                                        {settings.contact.email}
                                    </a>
                                </div>
                            )}

                            {settings.contact?.address && (
                                <div className="flex items-start gap-2 text-xs">
                                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                                        <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-pink-200/70">Địa chỉ:</span>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.contact.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-pink-100/90 text-[11px] leading-tight hover:text-white transition-colors underline-offset-2 hover:underline flex items-center gap-1"
                                        >
                                            <span>{settings.contact.address}</span>
                                            <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Social Links Row */}
                        {socialLinks.length > 0 && (
                            <div className="flex items-center gap-2 pt-2">
                                <span className="text-xs text-pink-300/50 font-medium">Kết nối:</span>
                                <div className="flex items-center gap-1.5">
                                    {socialLinks.map((soc, idx) => (
                                        <a
                                            key={idx}
                                            href={soc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={soc.name}
                                            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/20 flex items-center justify-center text-pink-200 hover:text-white transition-all duration-200 shadow-sm"
                                        >
                                            {soc.icon}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System Status Pill */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold w-fit mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>Hệ thống nạp ví SePay & giao nick hoạt động 100%</span>
                        </div>
                    </div>

                    {/* Col 2: Kho Nick Hot (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                            <span className="w-1.5 h-3.5 rounded-full bg-rose-500" />
                            Kho Nick Game Hot
                        </h4>
                        <ul className="flex flex-col gap-2.5 text-xs text-pink-200/65">
                            {displayedGames.map((item, idx) => (
                                <li key={item.id || idx}>
                                    <Link
                                        href={item.slug ? `/game/${item.slug}` : '/#kho-nick'}
                                        className="hover:text-rose-300 transition-colors flex items-center justify-between group cursor-pointer"
                                    >
                                        <span className="group-hover:translate-x-1 transition-transform">
                                            {item.name}
                                        </span>
                                        {idx === 0 ? (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                                Hot
                                            </span>
                                        ) : idx === 1 ? (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                Sale 20%
                                            </span>
                                        ) : item.accountsCount && item.accountsCount > 0 ? (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-white/10 text-pink-200 border border-white/10">
                                                {item.accountsCount} acc
                                            </span>
                                        ) : null}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 3: Chính Sách & Hỗ Trợ (2 cols) - CLICK MỞ MODAL NỘI DUNG CHI TIẾT */}
                    <div className="lg:col-span-2 flex flex-col gap-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                            <span className="w-1.5 h-3.5 rounded-full bg-purple-500" />
                            Chính Sách & Hỗ Trợ
                        </h4>
                        <ul className="flex flex-col gap-2.5 text-xs text-pink-200/65">
                            <li>
                                <Link
                                    href="/tin-tuc"
                                    className="hover:text-rose-300 transition-colors flex items-center justify-between group cursor-pointer text-pink-100 font-semibold"
                                >
                                    <span className="group-hover:translate-x-1 transition-transform">
                                        Tin Tức & Cẩm Nang
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        Mới
                                    </span>
                                </Link>
                            </li>
                            {[
                                { label: 'Hướng dẫn mua nick 3 bước', topic: 'guide' as PolicyTopic },
                                { label: 'Chính sách bảo hành', topic: 'warranty' as PolicyTopic },
                                { label: 'Quy trình đổi trả & hoàn tiền', topic: 'refund' as PolicyTopic },
                                { label: 'Bảng giá nạp ví chiết khấu', topic: 'pricing' as PolicyTopic },
                                { label: 'Điều khoản sử dụng dịch vụ', topic: 'terms' as PolicyTopic },
                                { label: 'Bảo mật thông tin khách hàng', topic: 'privacy' as PolicyTopic },
                                { label: 'Câu hỏi thường gặp (FAQ)', topic: 'faq' as PolicyTopic },
                            ].map((item, idx) => (
                                <li key={idx}>
                                    <button
                                        type="button"
                                        onClick={() => handlePolicyClick(item.topic)}
                                        className="hover:text-purple-300 transition-colors flex items-center gap-1 group text-left cursor-pointer"
                                    >
                                        <span className="group-hover:translate-x-1 transition-transform">
                                            {item.label}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 4: Phương Thức Thanh Toán - CHỈ CÓ SEPAY */}
                    <div className="lg:col-span-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                <span className="w-1.5 h-3.5 rounded-full bg-emerald-500" />
                                Thanh Toán Tự Động 24/7
                            </h4>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                SePay Gateway
                            </span>
                        </div>

                        <p className="text-[11px] text-pink-200/50 leading-relaxed">
                            Hệ thống tích hợp cổng thanh toán <strong>SePay VietQR 24/7</strong>. Quét mã nạp tiền tự
                            động không mất phí, cộng số dư trong 3 giây:
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {sepayPaymentMethods.map((pm, idx) => (
                                <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl bg-gradient-to-br ${pm.color} border transition-all flex flex-col justify-center`}
                                >
                                    <div className="font-bold text-xs leading-tight flex items-center gap-1">
                                        <QrCode className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{pm.name}</span>
                                    </div>
                                    <div className="text-[10px] text-pink-200/50 mt-0.5">{pm.desc}</div>
                                </div>
                            ))}
                        </div>

                        {/* Certifications & Trust Badges */}
                        <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Bảo Mật SSL 256-Bit</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-bold">
                                <Award className="w-3.5 h-3.5" />
                                <span>Auto SePay 100%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BOTTOM COPYRIGHT & LEGAL BAR ── */}
                <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-pink-300/40">
                    <div className="text-center md:text-left">
                        <span>
                            {settings.footer?.copyright ||
                                `© ${new Date().getFullYear()} ${settings.brandName || settings.siteName || 'GameStore.vn'} — Sàn giao dịch tài khoản game tự động uy tín & an toàn nhất Việt Nam.`}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                        <span>Thiết kế & Vận hành với đam mê cho cộng đồng game thủ</span>
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
                    </div>
                </div>
            </div>

            {/* ── INTERACTIVE POLICY MODAL ── */}
            <Modal
                open={activePolicy !== null && activePolicy !== 'faq'}
                onCancel={() => setActivePolicy(null)}
                footer={null}
                width={550}
                centered
                className="custom-admin-modal"
            >
                {activePolicy && policyDetails[activePolicy] && (
                    <div className="pt-2 pb-2 space-y-4">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                {policyDetails[activePolicy].icon}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white tracking-tight">
                                    {policyDetails[activePolicy].title}
                                </h3>
                                <span className="text-[11px] text-pink-300/50">
                                    {settings.brandName || 'GameStore'} • Trung Tâm Hỗ Trợ Khách Hàng
                                </span>
                            </div>
                        </div>

                        <div className="py-2">{policyDetails[activePolicy].content}</div>

                        <div className="pt-3 border-t border-white/10 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setActivePolicy(null)}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-md shadow-rose-900/30 cursor-pointer"
                            >
                                Đã Hiểu
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </footer>
    );
}
