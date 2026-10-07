export interface SupportedBankInfo {
  code: string;
  name: string;
  shortName: string;
  hasOfficialVA: boolean;
  isVAMandatory: boolean;
  supportsIn: boolean;
  supportsOut: boolean;
  notes?: string;
  logoUrl?: string;
}

export const SEPAY_SUPPORTED_BANKS: SupportedBankInfo[] = [
  {
    code: 'MBBank',
    name: 'Ngân hàng Quân Đội (MBBank)',
    shortName: 'MBBank',
    hasOfficialVA: true,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: false,
    notes: 'Hỗ trợ VA chính thức & Tài khoản chính',
  },
  {
    code: 'Vietcombank',
    name: 'Ngân hàng TMCP Ngoại Thương Việt Nam (VCB)',
    shortName: 'Vietcombank',
    hasOfficialVA: true,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: false,
    notes: 'Hỗ trợ VA chính thức & Tài khoản chính',
  },
  {
    code: 'BIDV',
    name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    shortName: 'BIDV',
    hasOfficialVA: true,
    isVAMandatory: true,
    supportsIn: true,
    supportsOut: false,
    notes: 'Bắt buộc qua VA, không có tài khoản chính',
  },
  {
    code: 'ACB',
    name: 'Ngân hàng Á Châu (ACB)',
    shortName: 'ACB',
    hasOfficialVA: true,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: false,
    notes: 'Hỗ trợ VA chính thức & Tài khoản chính',
  },
  {
    code: 'VietinBank',
    name: 'Ngân hàng TMCP Công Thương Việt Nam (CTG)',
    shortName: 'VietinBank',
    hasOfficialVA: true,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: true,
    notes: 'VA chính thức (Doanh nghiệp), Cá nhân dùng TKP (VA nội dung). Hỗ trợ tiền ra.',
  },
  {
    code: 'TPBank',
    name: 'Ngân hàng Tiên Phong (TPBank)',
    shortName: 'TPBank',
    hasOfficialVA: false,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: true,
    notes: 'Không cấp VA chính thức, dùng TKP (VA nội dung). Hỗ trợ tiền ra.',
  },
  {
    code: 'VPBank',
    name: 'Ngân hàng Việt Nam Thịnh Vượng (VPBank)',
    shortName: 'VPBank',
    hasOfficialVA: false,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: false,
    notes: 'Không cấp VA chính thức, dùng TKP. Chỉ đồng bộ tiền vào.',
  },
  {
    code: 'MSB',
    name: 'Ngân hàng Hàng Hải (MSB)',
    shortName: 'MSB',
    hasOfficialVA: true,
    isVAMandatory: true,
    supportsIn: true,
    supportsOut: false,
    notes: 'Bắt buộc qua VA, không có tài khoản chính',
  },
  {
    code: 'OCB',
    name: 'Ngân hàng Phương Đông (OCB)',
    shortName: 'OCB',
    hasOfficialVA: true,
    isVAMandatory: true,
    supportsIn: true,
    supportsOut: false,
    notes: 'Bắt buộc qua VA (Cá nhân)',
  },
  {
    code: 'KienlongBank',
    name: 'Ngân hàng Kiên Long (KLB)',
    shortName: 'KienlongBank',
    hasOfficialVA: true,
    isVAMandatory: true,
    supportsIn: true,
    supportsOut: false,
    notes: 'Bắt buộc qua VA, không có tài khoản chính',
  },
  {
    code: 'Sacombank',
    name: 'Ngân hàng Sài Gòn Thương Tín (STB)',
    shortName: 'Sacombank',
    hasOfficialVA: false,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: true,
    notes: 'Dùng TKP (VA nội dung). Hỗ trợ cả tiền vào và tiền ra.',
  },
  {
    code: 'Techcombank',
    name: 'Ngân hàng Kỹ Thương Việt Nam (TCB)',
    shortName: 'Techcombank',
    hasOfficialVA: false,
    isVAMandatory: false,
    supportsIn: true,
    supportsOut: false,
    notes: 'Nhận diện theo số tài khoản chính hoặc TKP',
  },
];

export interface VirtualAccountItem {
  id: string;
  code: string; // VD: "ORDER001", "TKP_VIP", "SEVN01"
  name: string; // Tên gợi nhớ
  type: 'official' | 'content'; // 'official': VA chính thức | 'content': TKP (VA nội dung)
  active: boolean;
}

export interface BankAccountConfig {
  id: string;
  bankCode: string; // Khớp với SEPAY_SUPPORTED_BANKS (MBBank, Vietcombank, ...)
  bankName: string;
  accountNumber: string; // Số tài khoản chính hoặc VA
  accountHolder: string; // Chủ tài khoản (VD: NGUYEN VAN A)
  branch?: string;
  isDefault: boolean; // Tài khoản ưu tiên hiển thị QR Nạp tiền
  active: boolean;
  
  // SePay VA Configuration
  vaMode: 'all' | 'specific'; // 'all': Tất cả tài khoản | 'specific': Chọn cụ thể
  useMainAccount: boolean; // Nhận tiền từ tài khoản chính
  virtualAccounts: VirtualAccountItem[]; // Danh sách VA / TKP
}

export interface SePayConfig {
  apiKey: string; // SePay API Key / Token
  webhookUrl: string; // https://domain.com/api/webhooks/sepay
  autoApprove: boolean; // Tự động duyệt đơn & nạp ví
  depositPrefix: string; // Mặc định 'NAP'
  buyPrefix: string; // Mặc định 'BUY' hoặc '#'
  active: boolean;
  accounts: BankAccountConfig[];
}

export interface PublicBankInfo {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  isDefault: boolean;
  qrUrlTemplate?: string;
}

export interface PublicPaymentSettings {
  sepayActive: boolean;
  depositPrefix: string;
  minDepositAmount: number;
  banks: PublicBankInfo[];
  hotline: string;
  supportEmail: string;
}
