import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh' | 'ms' | 'ta';

interface UserProfile {
  id: string;
  name: string;
  nric: string;
  chasType: 'Blue' | 'Orange' | 'Green';
  points: number;
  participationHistory: string[];
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isVoiceEnabled: boolean;
  setIsVoiceEnabled: (enabled: boolean) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Scan screen
    'scan.title': 'Welcome',
    'scan.subtitle': 'Please scan your IC / CHAS card to continue',
    'scan.instruction': 'Place your card on the scanner',
    'scan.scanning': 'Scanning...',
    'scan.success': 'Scan successful!',
    'scan.loading': 'Loading your profile...',
    
    // Language selection
    'lang.title': 'Choose Your Language',
    'lang.subtitle': 'Select your preferred language',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.title': 'How can we help you today?',
    'dashboard.health': 'Health Screenings',
    'dashboard.health.desc': 'Check your blood pressure, height & weight',
    'dashboard.teleconsult': 'Teleconsultation',
    'dashboard.teleconsult.desc': 'Speak to a doctor online',
    'dashboard.community': 'Community Programmes',
    'dashboard.community.desc': 'Join health talks & activities',
    'dashboard.profile': 'My Profile',
    'dashboard.profile.desc': 'View your points & rewards',
    
    // Health screenings
    'health.title': 'Health Screenings',
    'health.bp': 'Blood Pressure',
    'health.bp.desc': 'Measure your blood pressure',
    'health.weight': 'Height & Weight',
    'health.weight.desc': 'Record your measurements',
    'health.back': 'Back to Menu',
    'health.result': 'Your Result',
    'health.normal': 'Normal',
    'health.date': 'Measured on',
    'health.pastResults': 'Past Results',
    'health.saved': 'Result saved successfully',
    'health.saveFailed': 'Failed to save result',
    
    // Teleconsult
    'teleconsult.title': 'Teleconsultation',
    'teleconsult.subtitle': 'Speak to a doctor from home',
    'teleconsult.polyclinic': 'Polyclinic Doctor',
    'teleconsult.hospital': 'Hospital Specialist',
    'teleconsult.serious': 'For serious conditions, please visit a polyclinic or hospital in person.',
    'teleconsult.payment': 'Payment Options',
    'teleconsult.card': 'Pay by Card',
    'teleconsult.cash': 'Bill to Home (Cash)',
    'teleconsult.start': 'Start Consultation',
    'teleconsult.connecting': 'Connecting to doctor...',
    'teleconsult.connected': 'Consultation Started',
    'teleconsult.connected.desc': 'Your video consultation has been opened in a new browser tab.',
    'teleconsult.failed': 'Connection Failed',
    'teleconsult.failed.desc': 'Unable to start the teleconsultation. Please try again.',
    'teleconsult.tryAgain': 'Try Again',
    'teleconsult.goBack': 'Go Back',
    'teleconsult.returnDashboard': 'Return to Dashboard',
    
    // Community
    'community.title': 'Community Programmes',
    'community.upcoming': 'Upcoming Events',
    'community.past': 'Past Events',
    'community.signup': 'Sign Up',
    'community.signed': 'Signed Up',
    'community.reviews': 'Reviews',
    'community.points': 'points',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.chas': 'CHAS Card Type',
    'profile.points': 'Total Points',
    'profile.history': 'Participation History',
    'profile.rewards': 'Redeem Rewards',
    'profile.voucher': 'Voucher',
    'profile.redeem': 'Redeem',
    
    // Accessibility
    'access.translate': 'Translate',
    'access.voice': 'Voice Guide',
    'access.voiceOn': 'Voice On',
    'access.voiceOff': 'Voice Off',
    
    // Common
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.logout': 'Log Out',
  },
  zh: {
    'scan.title': '欢迎',
    'scan.subtitle': '请扫描您的身份证/CHAS卡以继续',
    'scan.instruction': '将您的卡放在扫描器上',
    'scan.scanning': '扫描中...',
    'scan.success': '扫描成功！',
    'scan.loading': '正在加载您的资料...',
    
    'lang.title': '选择您的语言',
    'lang.subtitle': '选择您偏好的语言',
    
    'dashboard.welcome': '欢迎',
    'dashboard.title': '今天我们能如何帮助您？',
    'dashboard.health': '健康检查',
    'dashboard.health.desc': '检查血压、身高和体重',
    'dashboard.teleconsult': '远程医疗',
    'dashboard.teleconsult.desc': '在线咨询医生',
    'dashboard.community': '社区活动',
    'dashboard.community.desc': '参加健康讲座和活动',
    'dashboard.profile': '我的资料',
    'dashboard.profile.desc': '查看积分和奖励',
    
    'health.title': '健康检查',
    'health.bp': '血压',
    'health.bp.desc': '测量您的血压',
    'health.weight': '身高和体重',
    'health.weight.desc': '记录您的测量数据',
    'health.back': '返回菜单',
    'health.result': '您的结果',
    'health.normal': '正常',
    'health.date': '测量日期',
    'health.pastResults': '过往结果',
    'health.saved': '结果保存成功',
    'health.saveFailed': '保存结果失败',
    
    'teleconsult.title': '远程医疗',
    'teleconsult.subtitle': '在家与医生交谈',
    'teleconsult.polyclinic': '综合诊所医生',
    'teleconsult.hospital': '医院专科医生',
    'teleconsult.serious': '如有严重情况，请亲自前往综合诊所或医院。',
    'teleconsult.payment': '付款方式',
    'teleconsult.card': '刷卡付款',
    'teleconsult.cash': '账单寄到家（现金）',
    'teleconsult.start': '开始咨询',
    'teleconsult.connecting': '正在连接医生...',
    'teleconsult.connected': '咨询已开始',
    'teleconsult.connected.desc': '您的视频咨询已在新标签页中打开。',
    'teleconsult.failed': '连接失败',
    'teleconsult.failed.desc': '无法启动远程医疗，请重试。',
    'teleconsult.tryAgain': '重试',
    'teleconsult.goBack': '返回',
    'teleconsult.returnDashboard': '返回主页',
    
    'community.title': '社区活动',
    'community.upcoming': '即将举行的活动',
    'community.past': '过往活动',
    'community.signup': '报名',
    'community.signed': '已报名',
    'community.reviews': '评价',
    'community.points': '积分',
    
    'profile.title': '我的资料',
    'profile.chas': 'CHAS卡类型',
    'profile.points': '总积分',
    'profile.history': '参与记录',
    'profile.rewards': '兑换奖励',
    'profile.voucher': '礼券',
    'profile.redeem': '兑换',
    
    'access.translate': '翻译',
    'access.voice': '语音指南',
    'access.voiceOn': '语音开启',
    'access.voiceOff': '语音关闭',
    
    'common.back': '返回',
    'common.next': '下一步',
    'common.done': '完成',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.logout': '登出',
  },
  ms: {
    'scan.title': 'Selamat Datang',
    'scan.subtitle': 'Sila imbas kad IC / CHAS anda untuk meneruskan',
    'scan.instruction': 'Letakkan kad anda pada pengimbas',
    'scan.scanning': 'Mengimbas...',
    'scan.success': 'Imbasan berjaya!',
    'scan.loading': 'Memuatkan profil anda...',
    
    'lang.title': 'Pilih Bahasa Anda',
    'lang.subtitle': 'Pilih bahasa pilihan anda',
    
    'dashboard.welcome': 'Selamat Datang',
    'dashboard.title': 'Bagaimana kami boleh membantu anda hari ini?',
    'dashboard.health': 'Pemeriksaan Kesihatan',
    'dashboard.health.desc': 'Periksa tekanan darah, tinggi & berat badan',
    'dashboard.teleconsult': 'Telekonsultasi',
    'dashboard.teleconsult.desc': 'Berbual dengan doktor dalam talian',
    'dashboard.community': 'Program Komuniti',
    'dashboard.community.desc': 'Sertai ceramah & aktiviti kesihatan',
    'dashboard.profile': 'Profil Saya',
    'dashboard.profile.desc': 'Lihat mata & ganjaran anda',
    
    'health.title': 'Pemeriksaan Kesihatan',
    'health.bp': 'Tekanan Darah',
    'health.bp.desc': 'Ukur tekanan darah anda',
    'health.weight': 'Tinggi & Berat',
    'health.weight.desc': 'Rekod ukuran anda',
    'health.back': 'Kembali ke Menu',
    'health.result': 'Keputusan Anda',
    'health.normal': 'Normal',
    'health.date': 'Diukur pada',
    'health.pastResults': 'Keputusan Lepas',
    'health.saved': 'Keputusan berjaya disimpan',
    'health.saveFailed': 'Gagal menyimpan keputusan',
    
    'teleconsult.title': 'Telekonsultasi',
    'teleconsult.subtitle': 'Berbual dengan doktor dari rumah',
    'teleconsult.polyclinic': 'Doktor Poliklinik',
    'teleconsult.hospital': 'Pakar Hospital',
    'teleconsult.serious': 'Untuk keadaan serius, sila kunjungi poliklinik atau hospital secara peribadi.',
    'teleconsult.payment': 'Pilihan Pembayaran',
    'teleconsult.card': 'Bayar dengan Kad',
    'teleconsult.cash': 'Bil ke Rumah (Tunai)',
    'teleconsult.start': 'Mula Konsultasi',
    'teleconsult.connecting': 'Menyambung kepada doktor...',
    'teleconsult.connected': 'Konsultasi Dimulakan',
    'teleconsult.connected.desc': 'Konsultasi video anda telah dibuka dalam tab pelayar baharu.',
    'teleconsult.failed': 'Sambungan Gagal',
    'teleconsult.failed.desc': 'Tidak dapat memulakan telekonsultasi. Sila cuba lagi.',
    'teleconsult.tryAgain': 'Cuba Lagi',
    'teleconsult.goBack': 'Kembali',
    'teleconsult.returnDashboard': 'Kembali ke Papan Pemuka',
    
    'community.title': 'Program Komuniti',
    'community.upcoming': 'Acara Akan Datang',
    'community.past': 'Acara Lepas',
    'community.signup': 'Daftar',
    'community.signed': 'Telah Daftar',
    'community.reviews': 'Ulasan',
    'community.points': 'mata',
    
    'profile.title': 'Profil Saya',
    'profile.chas': 'Jenis Kad CHAS',
    'profile.points': 'Jumlah Mata',
    'profile.history': 'Sejarah Penyertaan',
    'profile.rewards': 'Tebus Ganjaran',
    'profile.voucher': 'Baucar',
    'profile.redeem': 'Tebus',
    
    'access.translate': 'Terjemah',
    'access.voice': 'Panduan Suara',
    'access.voiceOn': 'Suara Hidup',
    'access.voiceOff': 'Suara Mati',
    
    'common.back': 'Kembali',
    'common.next': 'Seterusnya',
    'common.done': 'Selesai',
    'common.cancel': 'Batal',
    'common.confirm': 'Sahkan',
    'common.logout': 'Log Keluar',
  },
  ta: {
    'scan.title': 'வரவேற்கிறோம்',
    'scan.subtitle': 'தொடர உங்கள் IC / CHAS அட்டையை ஸ்கேன் செய்யவும்',
    'scan.instruction': 'உங்கள் அட்டையை ஸ்கேனரில் வைக்கவும்',
    'scan.scanning': 'ஸ்கேன் செய்கிறது...',
    'scan.success': 'ஸ்கேன் வெற்றி!',
    'scan.loading': 'உங்கள் சுயவிவரத்தை ஏற்றுகிறது...',
    
    'lang.title': 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    'lang.subtitle': 'உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
    
    'dashboard.welcome': 'வரவேற்கிறோம்',
    'dashboard.title': 'இன்று நாங்கள் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
    'dashboard.health': 'சுகாதார பரிசோதனைகள்',
    'dashboard.health.desc': 'இரத்த அழுத்தம், உயரம் & எடையை சரிபார்க்கவும்',
    'dashboard.teleconsult': 'தொலை ஆலோசனை',
    'dashboard.teleconsult.desc': 'ஆன்லைனில் மருத்துவரிடம் பேசுங்கள்',
    'dashboard.community': 'சமூக திட்டங்கள்',
    'dashboard.community.desc': 'சுகாதார பேச்சுக்கள் & செயல்பாடுகளில் சேரவும்',
    'dashboard.profile': 'எனது சுயவிவரம்',
    'dashboard.profile.desc': 'உங்கள் புள்ளிகள் & வெகுமதிகளைப் பார்க்கவும்',
    
    'health.title': 'சுகாதார பரிசோதனைகள்',
    'health.bp': 'இரத்த அழுத்தம்',
    'health.bp.desc': 'உங்கள் இரத்த அழுத்தத்தை அளவிடுங்கள்',
    'health.weight': 'உயரம் & எடை',
    'health.weight.desc': 'உங்கள் அளவீடுகளை பதிவு செய்யுங்கள்',
    'health.back': 'மெனுவிற்கு திரும்பு',
    'health.result': 'உங்கள் முடிவு',
    'health.normal': 'சாதாரண',
    'health.date': 'அளவிடப்பட்ட தேதி',
    'health.pastResults': 'கடந்த முடிவுகள்',
    'health.saved': 'முடிவு வெற்றிகரமாக சேமிக்கப்பட்டது',
    'health.saveFailed': 'முடிவை சேமிக்க முடியவில்லை',
    
    'teleconsult.title': 'தொலை ஆலோசனை',
    'teleconsult.subtitle': 'வீட்டிலிருந்தே மருத்துவரிடம் பேசுங்கள்',
    'teleconsult.polyclinic': 'பாலிகிளினிக் மருத்துவர்',
    'teleconsult.hospital': 'மருத்துவமனை நிபுணர்',
    'teleconsult.serious': 'தீவிர நிலைகளுக்கு, நேரில் பாலிகிளினிக் அல்லது மருத்துவமனைக்கு செல்லவும்.',
    'teleconsult.payment': 'கட்டண விருப்பங்கள்',
    'teleconsult.card': 'அட்டையில் செலுத்து',
    'teleconsult.cash': 'வீட்டிற்கு பில் (பணம்)',
    'teleconsult.start': 'ஆலோசனையைத் தொடங்கு',
    'teleconsult.connecting': 'மருத்துவருடன் இணைக்கிறது...',
    'teleconsult.connected': 'ஆலோசனை தொடங்கியது',
    'teleconsult.connected.desc': 'உங்கள் வீடியோ ஆலோசனை புதிய உலாவி தாவலில் திறக்கப்பட்டது.',
    'teleconsult.failed': 'இணைப்பு தோல்வி',
    'teleconsult.failed.desc': 'தொலை ஆலோசனையைத் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    'teleconsult.tryAgain': 'மீண்டும் முயற்சி',
    'teleconsult.goBack': 'பின்செல்',
    'teleconsult.returnDashboard': 'டாஷ்போர்டுக்கு திரும்பு',
    
    'community.title': 'சமூக திட்டங்கள்',
    'community.upcoming': 'வரவிருக்கும் நிகழ்வுகள்',
    'community.past': 'கடந்த நிகழ்வுகள்',
    'community.signup': 'பதிவு செய்',
    'community.signed': 'பதிவு செய்யப்பட்டது',
    'community.reviews': 'மதிப்புரைகள்',
    'community.points': 'புள்ளிகள்',
    
    'profile.title': 'எனது சுயவிவரம்',
    'profile.chas': 'CHAS அட்டை வகை',
    'profile.points': 'மொத்த புள்ளிகள்',
    'profile.history': 'பங்கேற்பு வரலாறு',
    'profile.rewards': 'வெகுமதிகளை பெறுங்கள்',
    'profile.voucher': 'வவுச்சர்',
    'profile.redeem': 'பெறு',
    
    'access.translate': 'மொழிபெயர்',
    'access.voice': 'குரல் வழிகாட்டி',
    'access.voiceOn': 'குரல் இயக்கம்',
    'access.voiceOff': 'குரல் நிறுத்தம்',
    
    'common.back': 'பின்செல்',
    'common.next': 'அடுத்து',
    'common.done': 'முடிந்தது',
    'common.cancel': 'ரத்து',
    'common.confirm': 'உறுதிப்படுத்து',
    'common.logout': 'வெளியேறு',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        user,
        setUser,
        isVoiceEnabled,
        setIsVoiceEnabled,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
