import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Read .env.local if exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gamestore';
const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

let cachedKey = null;

function getEncryptionKey() {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_ACCESS_SECRET ||
    'gamestore_dev_secret_key_credentials_aes256_gcm_2026';
  cachedKey = crypto.scryptSync(secret, 'gamestore_credentials_salt_v1', 32);
  return cachedKey;
}

function encryptText(plainText) {
  if (!plainText || typeof plainText !== 'string' || !plainText.trim()) return plainText || '';
  if (plainText.startsWith(PREFIX)) return plainText;
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption Error]:', error);
    return plainText;
  }
}

function encryptCredentials(creds) {
  if (!creds) return undefined;
  return {
    loginUsername: encryptText(creds.loginUsername),
    loginPassword: encryptText(creds.loginPassword),
    twoFactorCode: encryptText(creds.twoFactorCode),
    emailBound: encryptText(creds.emailBound),
    phoneBound: encryptText(creds.phoneBound),
    note: creds.note ? encryptText(creds.note) : undefined,
  };
}

const GAME_CATEGORIES = [
  {
    name: 'Liên Quân Mobile',
    slug: 'lien-quan-mobile',
    prefix: 'LQ',
    ranks: ['Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Kim Cương', 'Tinh Anh', 'Cao Thủ', 'Thách Đấu'],
    skinsList: ['Nakroth Thứ Nguyên Vệ Thần', 'Murad Chí Tôn Thần Kiếm', 'Raz Muay Thái', 'Tulen Chí Tôn Kiếm Tiên', 'Lauriel Thứ Nguyên Vệ Thần', 'Florentino Tinh Hệ', 'Airi Bích Hải Thánh Nữ', 'Liliana Nguyệt Mị Ly', 'Valhein Hoàng Tử Băng', 'Arthur Siêu Việt'],
    servers: ['Mặt Trời (Việt Nam)', 'Đài Loan', 'Thái Lan'],
    loginTypes: ['Garena (Trắng thông tin)', 'Facebook (Trắng mail)', 'Apple ID'],
    tagsPool: ['Full Tướng', 'Trang Phục SSS', 'Rank Cao Thủ', 'Trắng Thông Tin', 'Bàn Giao Tự Động', 'Uy Tín 100', 'Giá Rẻ', 'Hot Sàn'],
    images: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Valorant',
    slug: 'valorant',
    prefix: 'VAL',
    ranks: ['Iron 3', 'Bronze 3', 'Silver 3', 'Gold 3', 'Platinum 3', 'Diamond 3', 'Ascendant 3', 'Immortal 3', 'Radiant'],
    skinsList: ['Vandal Kuronami', 'Vandal Reaver', 'Vandal Prime', 'Vandal Araxys', 'Phantom Recon', 'Phantom Oni', 'Karambit Champions 2023', 'Butterfly Xenohunter', 'Operator Elderflame', 'Sheriff Neo Frontier'],
    servers: ['Việt Nam (VNG)', 'APAC (Singapore)', 'Bắc Mỹ (NA)'],
    loginTypes: ['Riot Games (Trắng Mail)', 'Riot Games (Đổi Mail)'],
    tagsPool: ['Radiant', 'Immortal', 'Full Skin Hot', 'Kuronami Vandal', 'Champions Knife', 'Trắng Mail', 'Bảo Hành Trọn Đời'],
    images: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Free Fire',
    slug: 'free-fire',
    prefix: 'FF',
    ranks: ['Bạch Kim IV', 'Kim Cương IV', 'Huyền Thoại', 'Thách Đấu (Top 100)'],
    skinsList: ['AK47 Rồng Xanh Lv7', 'MP40 Mãng Xà Lv7', 'M1014 Long Tộc Lv7', 'SCAR Cá Mập Đen Lv7', 'Bộ Quỷ Dạ Xoa', 'Quần Đi Biển', 'Bộ Hip Hop Cổ', 'Nắm Đấm Lôi Thần'],
    servers: ['Việt Nam'],
    loginTypes: ['Facebook (Trắng thông tin)', 'Google (Chính chủ)', 'VK'],
    tagsPool: ['Súng Nâng Cấp Lv7', 'Quỷ Dạ Xoa', 'Thách Đấu', 'Full Trợ Thủ', 'Set HipHop', 'Đổi Pass Siêu Tốc'],
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'FC Online',
    slug: 'fc-online',
    prefix: 'FCO',
    ranks: ['Thế Giới 3', 'Thế Giới 1', 'Huyền Thoại 3', 'Huyền Thoại 1', 'Thách Đấu', 'Siêu Sao'],
    skinsList: ['Ronaldo R9 ICON TM', 'Gullit ICON TM', 'Zidane ICON TM', 'Cristiano Ronaldo 24TOTY +8', 'Messi 23TS +8', 'Henry ICON TM', 'Son Heung Min 24TOTY +8'],
    servers: ['Garena Việt Nam'],
    loginTypes: ['Garena (Trắng thông tin)', 'Garena (Có SĐT bảo hành)'],
    tagsPool: ['Real Madrid 2000 Tỷ', 'MU 1500 Tỷ', 'Chelsea 3000 Tỷ', 'Full ICON The Moment', 'BP Trắng 500 Tỷ', 'HLV 5 Sao'],
    images: [
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Liên Minh Huyền Thoại',
    slug: 'lien-minh-huyen-thoai',
    prefix: 'LMHT',
    ranks: ['Vàng', 'Bạch Kim', 'Kim Cương', 'Cao Thủ', 'Đại Cao Thủ', 'Thách Đấu'],
    skinsList: ['Yasuo Chân Long Kiếm', 'Lee Sin Ma Sứ Hàng Hiệu', 'Ahri Bất Tử Thần Thoại Faker', 'Lux Thập Đại Nguyên Tố', 'Vayne Đoạt Hồn', 'Riven Quán Quân 2012', 'Aatrox Huyết Nguyệt Hàng Hiệu'],
    servers: ['Việt Nam (VNG Riot)', 'Bắc Mỹ (NA)', 'Hàn Quốc (KR)'],
    loginTypes: ['Riot Games (Trắng Mail)', 'Riot Games (Đổi Mail tức thì)'],
    tagsPool: ['Full 168 Tướng', '400+ Skin', 'Rank Thách Đấu', 'Skin Hàng Hiệu', 'Skin Thần Thoại Faker', 'Bảo Hành Vĩnh Viễn'],
    images: [
      'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Genshin Impact',
    slug: 'genshin-impact',
    prefix: 'GEN',
    ranks: ['AR 55', 'AR 56', 'AR 57', 'AR 58', 'AR 59', 'AR 60 (Max)'],
    skinsList: ['Raiden Shogun C6 R5', 'Furina Thủy Thần C6 R5', 'Nahida Thảo Thần C6', 'Zhongli Nham Thần C2', 'Arlecchino C6 R1', 'Neuvillette C6 R5', 'Hu Tao C6 Hộ Ma', 'Kazuha C2 R1'],
    servers: ['Asia (Châu Á)', 'America', 'Europe'],
    loginTypes: ['HoYoverse (Trắng Mail)', 'HoYoverse (Đổi Mail trực tiếp)'],
    tagsPool: ['AR60', 'C6 R5', 'Raiden C6', 'Furina C6', 'Full Thần Linh', '30.000 Nguyên Thạch', 'Trắng Thông Tin 100%'],
    images: [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Roblox',
    slug: 'roblox',
    prefix: 'RBLX',
    ranks: ['Max Level 2550', 'Level 2400+', 'Bounty 30M'],
    skinsList: ['Trái Ác Quỷ Kitsune V2', 'Trái Rồng Dragon Rework', 'Trái Leopard V2', 'Trái Dough V2 Thức Tỉnh', 'Song Kiếm Oden Cursed Dual Katana', 'Godhuman Max Mastery', 'Guitar Linh Hồn Soul Guitar'],
    servers: ['Global'],
    loginTypes: ['Tài Khoản Mật Khẩu (Trắng Mail/SĐT)', 'Chính Chủ Đổi Pass'],
    tagsPool: ['Blox Fruits Max Lv', 'Trái Kitsune', 'Trái Leopard', 'Godhuman', 'Song Kiếm Cursed', '5000 Robux Dư', 'Bounty 30 Triệu'],
    images: [
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'PUBG Mobile',
    slug: 'pubg-mobile',
    prefix: 'PUBG',
    ranks: ['Kim Cương', 'Quán Quân', 'Cao Thủ', 'Chí Tôn (Top 500)'],
    skinsList: ['M416 Băng K9 Lv7 Max', 'M416 Glacier Lv7', 'AWM Thần Long Lv7', 'Bộ X-Suit Hoàng Kim 6 Sao', 'Bộ X-Suit Poseidon 6 Sao', 'Xe Lamborghini Aventador Vàng', 'Xe McLaren P1'],
    servers: ['Việt Nam (VNG)', 'Quốc Tế (Global)'],
    loginTypes: ['Twitter (Trắng mail)', 'Facebook', 'Google Play'],
    tagsPool: ['M416 Băng Max Lv7', 'X-Suit 6 Sao', 'Xe Lamborghini', 'Rank Chí Tôn', 'Thẻ Đổi Tên Sẵn', 'Bàn Giao Tự Động'],
    images: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Tốc Chiến (Wild Rift)',
    slug: 'toc-chien',
    prefix: 'TC',
    ranks: ['Lục Bảo', 'Kim Cương', 'Cao Thủ', 'Đại Cao Thủ', 'Thách Đấu'],
    skinsList: ['Zed Tử Thần Không Gian Siêu Cấp', 'Yasuo Ma Kiếm', 'Jinx Pháo Thủ Siêu Quậy Tối Thượng', 'Lee Sin Nộ Long Cước Hàng Hiệu', 'Ahri Vệ Binh Tinh Tú Tối Thượng', 'Akali K/DA All Out'],
    servers: ['Việt Nam (VNG Riot)'],
    loginTypes: ['Riot Games (Trắng Mail)', 'Riot Games (Đổi Mail trực tiếp)'],
    tagsPool: ['Rank Thách Đấu S14', 'Full 115 Tướng', '180 Skin', 'Khung Thách Đấu VIP', 'Trắng Thông Tin 100%'],
    images: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Honkai: Star Rail',
    slug: 'honkai-star-rail',
    prefix: 'HSR',
    ranks: ['TB 60', 'TB 65', 'TB 68', 'TB 70 (Max)'],
    skinsList: ['Acheron E6 S1', 'Firefly E2 S1', 'Ruan Mei E1 S1', 'Aventurine E0 S1', 'Dan Heng IL E2 S1', 'Jingliu E1 S1', 'Kafka E2 S1', 'Black Swan E1 S1', 'Sparkle E0 S1'],
    servers: ['Asia (Châu Á)', 'America'],
    loginTypes: ['HoYoverse (Trắng Mail)', 'HoYoverse (Đổi Mail ngay)'],
    tagsPool: ['TB70', 'Acheron E6', 'Firefly E2', 'Full Đội Tàu Astral', '25.000 Ngọc Ánh Sao', 'Trắng Thông Tin 100%'],
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80'
    ]
  }
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAccount(game, index) {
  const codeNum = 10000 + index;
  const code = `#${game.prefix}-${codeNum}`;
  const rank = randomChoice(game.ranks);
  const server = randomChoice(game.servers);
  const loginType = randomChoice(game.loginTypes);
  
  // Random price between 100k and 12m with rounded to thousands
  const priceLevels = [
    randomInt(90, 250) * 1000,
    randomInt(250, 600) * 1000,
    randomInt(600, 1500) * 1000,
    randomInt(1500, 3500) * 1000,
    randomInt(3500, 8500) * 1000,
    randomInt(8500, 15000) * 1000,
  ];
  const price = randomChoice(priceLevels);
  const discountRate = randomChoice([0.1, 0.15, 0.2, 0.25, 0.3, 0.35]);
  const originalPrice = Math.round(price / (1 - discountRate));

  // Status distribution: 92% available, 6% sold, 2% reserved
  const randStatus = Math.random();
  let status = 'available';
  if (randStatus > 0.98) status = 'reserved';
  else if (randStatus > 0.92) status = 'sold';

  // Specific details per game
  const details = {
    'Rank': rank,
    'Máy chủ': server,
    'Đăng nhập': loginType,
    'Tình trạng thông tin': 'Trắng 100% (Đổi mật khẩu ngay)',
  };

  let title = '';
  let selectedTags = [];
  const pickedSkins = [randomChoice(game.skinsList), randomChoice(game.skinsList)].filter((v, i, a) => a.indexOf(v) === i);

  if (game.slug === 'lien-quan-mobile') {
    const heroCount = randomInt(75, 120);
    const skinCount = randomInt(110, 450);
    details['Số tướng'] = heroCount;
    details['Số trang phục'] = skinCount;
    details['Uy tín'] = 100;
    details['Trang phục nổi bật'] = pickedSkins.join(', ');
    title = `Acc Liên Quân ${rank} - ${heroCount} Tướng ${skinCount} Skin (${pickedSkins[0]})`;
    selectedTags = [rank, `${heroCount} Tướng`, `${skinCount} Skin`, 'Garena Trắng TT'];
  } else if (game.slug === 'valorant') {
    const vp = randomInt(50, 3500);
    const rad = randomInt(20, 250);
    details['Skin Vandal / Phantom'] = pickedSkins[0];
    details['Vũ khí cận chiến / Dao'] = pickedSkins[1] || 'Karambit Champions';
    details['Điểm VP còn dư'] = `${vp} VP`;
    details['Điểm Radianite'] = `${rad} RP`;
    title = `Acc Valorant [${rank}] - ${pickedSkins.join(' + ')} - Server ${server}`;
    selectedTags = [rank, pickedSkins[0], 'Trắng Mail', 'Bảo Hành 100%'];
  } else if (game.slug === 'free-fire') {
    const level = randomInt(55, 88);
    details['Cấp độ nhân vật'] = level;
    details['Vũ khí nâng cấp'] = pickedSkins.join(' • ');
    details['Rank Tử Chiến'] = rank;
    title = `Acc Free Fire Lv${level} [${rank}] - ${pickedSkins[0]} Max Lv7`;
    selectedTags = [`Lv${level}`, rank, pickedSkins[0], 'Đổi Pass Siêu Tốc'];
  } else if (game.slug === 'fc-online') {
    const squadValue = randomInt(300, 3500);
    const bp = randomInt(20, 300);
    details['Giá trị đội hình'] = `${squadValue} Tỷ BP`;
    details['Số dư BP trắng'] = `${bp} Tỷ`;
    details['Cầu thủ gánh team'] = pickedSkins.join(', ');
    title = `Acc FC Online Đội Hình ${squadValue} Tỷ BP - ${pickedSkins[0]} (${rank})`;
    selectedTags = [`${squadValue} Tỷ BP`, rank, 'Garena Trắng TT', 'Giao Dịch 24/7'];
  } else if (game.slug === 'lien-minh-huyen-thoai') {
    const champs = randomInt(120, 168);
    const skins = randomInt(150, 650);
    details['Số tướng'] = champs;
    details['Số trang phục'] = skins;
    details['Skin Thần Thoại / Hàng Hiệu'] = pickedSkins.join(' • ');
    title = `Acc LMHT [${rank}] - ${champs} Tướng ${skins} Skin (${pickedSkins[0]})`;
    selectedTags = [rank, `${champs} Tướng`, `${skins} Skin`, 'Riot Trắng Mail'];
  } else if (game.slug === 'genshin-impact') {
    const ar = rank;
    const char5 = randomInt(10, 42);
    const weapon5 = randomInt(5, 25);
    const gems = randomInt(1200, 28000);
    details['Cấp mạo hiểm (AR)'] = ar;
    details['Nhân vật 5 Sao'] = `${char5} tướng (${pickedSkins[0]})`;
    details['Vũ khí 5 Sao'] = `${weapon5} món`;
    details['Nguyên thạch tích lũy'] = `${gems.toLocaleString('vi-VN')} Gem`;
    title = `Acc Genshin ${ar} - ${char5} Char 5★ [${pickedSkins.join(' + ')}]`;
    selectedTags = [ar, `${char5} Tướng 5★`, `${gems} Gems`, 'Asia Server'];
  } else if (game.slug === 'roblox') {
    const robux = randomInt(200, 8000);
    details['Tựa game chính'] = 'Blox Fruits V4';
    details['Level'] = rank;
    details['Trái Ác Quỷ / Melee'] = pickedSkins.join(', ');
    details['Robux còn dư'] = `${robux} Robux`;
    title = `Acc Roblox Blox Fruits [${rank}] - ${pickedSkins[0]} + Song Kiếm`;
    selectedTags = [rank, pickedSkins[0], `${robux} Robux`, 'Chính Chủ 100%'];
  } else if (game.slug === 'pubg-mobile') {
    const xsuit = randomChoice(['X-Suit Hoàng Kim 6★', 'X-Suit Poseidon 6★', 'X-Suit Huyết Ma 5★']);
    details['Súng nâng cấp'] = pickedSkins[0];
    details['Bộ trang phục X-Suit'] = xsuit;
    details['Phương tiện / Siêu xe'] = randomChoice(['Lamborghini Vàng', 'McLaren P1', 'Koenigsegg']);
    title = `Acc PUBG Mobile [${rank}] - ${pickedSkins[0]} + ${xsuit}`;
    selectedTags = [rank, pickedSkins[0], 'X-Suit', 'VNG Trắng TT'];
  } else if (game.slug === 'toc-chien') {
    const champs = randomInt(60, 115);
    const skins = randomInt(40, 160);
    details['Số tướng'] = champs;
    details['Số skin'] = skins;
    details['Skin Huyền Thoại'] = pickedSkins.join(', ');
    title = `Acc Tốc Chiến [${rank}] - ${champs} Tướng ${skins} Skin (${pickedSkins[0]})`;
    selectedTags = [rank, `${champs} Tướng`, `${skins} Skin`, 'Riot Trắng Mail'];
  } else if (game.slug === 'honkai-star-rail') {
    const tb = rank;
    const char5 = randomInt(8, 30);
    const lightcone5 = randomInt(4, 18);
    const jades = randomInt(2000, 24000);
    details['Cấp khai phá (TB)'] = tb;
    details['Nhân vật 5 Sao'] = `${char5} tướng (${pickedSkins[0]})`;
    details['Nón ánh sáng 5 Sao'] = `${lightcone5} nón`;
    details['Ngọc ánh sao'] = `${jades.toLocaleString('vi-VN')} Ngọc`;
    title = `Acc Honkai Star Rail [${tb}] - ${pickedSkins.join(' + ')} (${char5} Char 5★)`;
    selectedTags = [tb, `${char5} Char 5★`, `${jades} Ngọc`, 'Asia Server'];
  }

  // Gallery images (3 to 4 images)
  const shuffledImages = [...game.images].sort(() => 0.5 - Math.random());
  const thumbnail = shuffledImages[0];
  const images = shuffledImages.slice(0, randomInt(2, 4));

  const rawUsername = `acc_${game.prefix.toLowerCase()}_${codeNum}`;
  const rawPassword = `Pass@${randomInt(100000, 999999)}`;

  return {
    code,
    gameSlug: game.slug,
    gameName: game.name,
    title,
    slug: `${game.slug}-${code.replace('#', '').toLowerCase()}`,
    price,
    originalPrice,
    discountPercent: Math.round(((originalPrice - price) / originalPrice) * 100),
    thumbnail,
    images,
    tags: selectedTags.slice(0, 4),
    highlights: pickedSkins,
    description: `Tài khoản ${game.name} mã ${code} chuẩn mô tả 100%. Đầy đủ ${pickedSkins.join(', ')}. Thông tin trắng chuẩn bảo mật, đổi mật khẩu và liên kết ngay sau khi thanh toán. Bàn giao tự động 24/7.`,
    status,
    isVerified: true,
    isFeatured: Math.random() < 0.15, // 15% featured
    isHot: Math.random() < 0.2,       // 20% hot
    views: randomInt(45, 3800),
    salesCount: status === 'sold' ? 1 : 0,
    rating: 5,
    reviewCount: randomInt(3, 48),
    warrantyPolicy: 'Bảo hành 1 đổi 1 hoặc hoàn tiền 100% trong 30 ngày nếu có lỗi từ thông tin tài khoản.',
    details,
    credentials: encryptCredentials({
      loginUsername: rawUsername,
      loginPassword: rawPassword,
      twoFactorCode: 'Trắng 2FA',
      emailBound: 'Trắng Email',
      phoneBound: 'Trắng SĐT',
      note: 'Vui lòng đổi mật khẩu và liên kết thông tin chính chủ ngay sau khi nhận tài khoản.'
    }),
    createdAt: new Date(Date.now() - randomInt(1, 45) * 86400000),
    updatedAt: new Date()
  };
}

async function main() {
  console.log('--- BẮT ĐẦU SEED 10 DANH MỤC & 5,000 NICK GAME ---');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const gamesColl = db.collection('games');
    const accountsColl = db.collection('accounts');

    // 1. Clear old collections
    console.log('1. Xoá dữ liệu cũ trong collections games và accounts...');
    await gamesColl.deleteMany({});
    await accountsColl.deleteMany({});

    // 2. Insert 10 Categories
    console.log('2. Đang tạo 10 danh mục game...');
    const categoryDocs = GAME_CATEGORIES.map((g) => ({
      name: g.name,
      slug: g.slug,
      accountsCount: 500,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    await gamesColl.insertMany(categoryDocs);
    console.log('✅ Đã tạo thành công 10 danh mục game!');

    // 3. Generate and bulk-insert 5,000 accounts (500 per category)
    console.log('3. Đang sinh và mã hoá 5,000 tài khoản game (AES-256-GCM)...');
    let totalInserted = 0;

    for (const game of GAME_CATEGORIES) {
      const batch = [];
      for (let i = 1; i <= 500; i++) {
        batch.push(generateAccount(game, i));
      }
      await accountsColl.insertMany(batch);
      totalInserted += batch.length;
      console.log(` -> Đã chèn 500 nick cho [${game.name}] (Tổng: ${totalInserted}/5000)`);
    }

    // 4. Create Indexes for High Performance Querying
    console.log('4. Đang tạo index tối ưu truy vấn...');
    try {
      await accountsColl.createIndex({ code: 1 }, { unique: true });
      await accountsColl.createIndex({ gameSlug: 1, status: 1 });
      await accountsColl.createIndex({ price: 1 });
      await accountsColl.createIndex({ createdAt: -1 });
      await accountsColl.createIndex({ views: -1 });
      await accountsColl.createIndex({ isFeatured: 1, isHot: 1 });
      await gamesColl.createIndex({ slug: 1 }, { unique: true });
    } catch (e) {
      console.warn('Index creation notice:', e.message);
    }

    console.log(`\n🎉 HOÀN TẤT THÀNH CÔNG!`);
    console.log(`- Tổng số danh mục game: ${GAME_CATEGORIES.length}`);
    console.log(`- Tổng số nick game trên DB: ${totalInserted}`);
  } catch (error) {
    console.error('Seed script error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
