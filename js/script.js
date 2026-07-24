// Navigation auto-restore router
(function checkRedirect() {
    const filename = window.location.pathname.split('/').pop().replace('.html', '');
    const pageId = (filename === '' || filename === 'index') ? 'index' : filename;
    
    if (pageId === 'index') {
        const lastCampaign = localStorage.getItem('global_last_campaign');
        const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
        
        if (lastCampaign && lastCampaign !== 'index') {
            if (defaultList.includes(lastCampaign)) {
                window.location.replace(`pages/${lastCampaign}.html`);
            } else {
                // If it's a custom template, redirect to the default sereniz page with the hash
                window.location.replace(`pages/sereniz.html#${lastCampaign}`);
            }
        } else {
            window.location.replace('pages/sereniz.html');
        }
    } else {
        const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
        if (defaultList.includes(pageId) || pageId.startsWith('custom_')) {
            localStorage.setItem('global_last_campaign', pageId);
        }
    }
})();

// ==========================================
// SUPABASE CONFIGURATION (OPTIONAL)
// ==========================================
// Fill in your credentials below to sync custom templates across the team.
// Other user data (Name, Phone, Email) will remain strictly local (not synced).
// NOTE: Use the "anon" (public) key here, NOT the "service_role" key for security.
const SUPABASE_URL = "https://ztgymxksjftjgssrypwi.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Z3lteGtzamZ0amdzc3J5cHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDk2MjYsImV4cCI6MjA5NzQyNTYyNn0.j3gVGNFffH_pOaJXiYFPZVauBIBoouQ7YNspoqniqkE";
// ==========================================

// ==========================================
// GLOBAL STATE DECLARATIONS (Declared early to prevent ReferenceErrors)
// ==========================================
const defaultProfiles = [];
let userProfiles = [];
let activeProfileId = '';
let customTemplates = {};
let supabaseClient = null;
let realtimeChannel = null;
let _realtimeRefreshTimer = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch(e) {
        console.error("Supabase load error: check CDN loading.", e);
    }
}
function initCustomTemplates() {
    const saved = localStorage.getItem('global_custom_templates');
    if (saved) {
        try {
            customTemplates = JSON.parse(saved);
        } catch(e) {
            customTemplates = {};
        }
    }
    
    // Explicitly delete and purge diagnostic mock templates from local cache
    let needsPurge = false;
    if (customTemplates['test_id']) {
        delete customTemplates['test_id'];
        needsPurge = true;
    }
    if (customTemplates['test_steps_id']) {
        delete customTemplates['test_steps_id'];
        needsPurge = true;
    }
    if (needsPurge) {
        localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
    }
    
    // Run sanitization on locally loaded templates
    sanitizeCustomTemplatesWithPlaceholders();
    
    if (supabaseClient) {
        loadSupabaseTemplates();
        subscribeToTemplateChanges();
    }
}

// Live sync (option 2): subscribe to Supabase Realtime so a teammate's add/edit/
// delete appears without a manual reload. Every change just re-runs
// loadSupabaseTemplates (which rebuilds from remote = source of truth), debounced
// so a burst of writes collapses into a single refresh. In-progress card edits are
// preserved because editedTexts survives the re-render.
// NOTE: this needs Realtime enabled for the custom_templates table in the Supabase
// dashboard (Database → Replication, or `alter publication supabase_realtime add
// table custom_templates`). If it isn't enabled, this silently no-ops — the app
// still works, teammates just won't see live updates until they reload.
function subscribeToTemplateChanges() {
    if (!supabaseClient || realtimeChannel) return;
    realtimeChannel = supabaseClient
        .channel('custom_templates_live')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'custom_templates' },
            () => {
                clearTimeout(_realtimeRefreshTimer);
                _realtimeRefreshTimer = setTimeout(loadSupabaseTemplates, 300);
            })
        .subscribe();
}

// A sender nickname is stripped from script bodies by a plain substring match,
// so a name that is also a common word (e.g. "ครับ") or the brand itself ("Drive")
// would rewrite every occurrence inside custom scripts — and sync that corruption
// to Supabase for the whole team. Only sanitize names that are distinctive enough.
const NAME_SANITIZE_STOPWORDS = new Set([
    'ครับ', 'ค่ะ', 'คะ', 'ค่า', 'นะ', 'จ้า', 'จ้าา', 'ครับผม', 'ผม', 'ดิฉัน', 'เรา',
    'Drive', 'drive', 'DRIVE', 'ไดร์ฟ', 'ไดรฟ์'
]);
function shouldSanitizeName(name) {
    if (!name) return false;
    const n = name.trim();
    return n.length >= 3 && !NAME_SANITIZE_STOPWORDS.has(n);
}

function sanitizeCustomTemplatesWithPlaceholders() {
    let changed = false;
    const legacyPhones = ['0641607169'];
    const legacyEmails = ['oak@drivebrand.co.th'];
    
    Object.keys(customTemplates).forEach(key => {
        const tpl = customTemplates[key];
        if (tpl && tpl.steps) {
            tpl.steps.forEach(step => {
                if (step.templateText) {
                    let text = step.templateText;
                    
                    // Replace legacy credentials
                    legacyPhones.forEach(ph => {
                        if (text.includes(ph)) {
                            text = text.replaceAll(ph, '{เบอร์โทร}');
                            changed = true;
                        }
                    });
                    legacyEmails.forEach(em => {
                        if (text.includes(em)) {
                            text = text.replaceAll(em, '{อีเมล}');
                            changed = true;
                        }
                    });
                    
                    // Replace current profiles credentials
                    if (userProfiles && userProfiles.length > 0) {
                        userProfiles.forEach(profile => {
                            if (profile.phone && profile.phone.trim().length > 3 && text.includes(profile.phone)) {
                                text = text.replaceAll(profile.phone, '{เบอร์โทร}');
                                changed = true;
                            }
                            if (profile.email && profile.email.includes('@') && profile.email.trim().length > 3 && text.includes(profile.email)) {
                                text = text.replaceAll(profile.email, '{อีเมล}');
                                changed = true;
                            }
                            if (shouldSanitizeName(profile.name) && text.includes(profile.name)) {
                                text = text.replaceAll(profile.name, '{ชื่อคนส่ง}');
                                changed = true;
                            }
                        });
                    }
                    
                    if (text !== step.templateText) {
                        step.templateText = text;
                        changed = true;
                    }
                }
            });
        }
    });
    
    if (changed) {
        localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
        if (supabaseClient) {
            Object.keys(customTemplates).forEach(key => {
                saveToSupabase(key, customTemplates[key]);
            });
        }
    }
}

async function loadSupabaseTemplates() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('custom_templates')
            .select('*');
            
        if (error) throw error;
        
        if (data) {
            // Supabase is the single source of truth for custom templates: rebuild
            // the local set entirely from remote instead of merging into it. A key
            // that exists locally but not remotely was deleted/reset by a teammate,
            // so it must disappear here too. (The old code re-uploaded such keys,
            // which resurrected everyone's deletions and kept stale overrides alive.)
            const rebuilt = {};
            data.forEach(item => {
                rebuilt[item.id] = {
                    title: item.title,
                    badge: item.badge,
                    showBudget: item.show_budget,
                    steps: item.steps
                };
            });
            customTemplates = rebuilt;

            // Run sanitization after loading remote updates
            sanitizeCustomTemplatesWithPlaceholders();

            localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
            renderSidebarNavigation();

            // If the template currently on screen was deleted remotely by a teammate,
            // fall back to this page's default so we don't render a blank workspace.
            if (!customTemplates[currentCampaign] && !templates[currentCampaign]) {
                currentCampaign = getPageId();
            }
            const currentHash = window.location.hash.replace('#', '');
            if (currentHash && customTemplates[currentHash]) {
                currentCampaign = currentHash;
            }
            renderActiveCampaign();
        }
    } catch(e) {
        console.error("Error loading templates from Supabase:", e);
        if (e && typeof e === 'object') {
            console.log("Supabase Error Details:", JSON.stringify(e));
            showToast("Supabase Connect Error: " + (e.message || "Unknown error"));
        }
    }
}

// Run initialization in the correct order
initUserProfiles();
initCustomTemplates();

function initUserProfiles() {
    const savedProfiles = localStorage.getItem('global_user_profiles');
    const savedActiveId = localStorage.getItem('global_active_profile_id');
    
    if (savedProfiles) {
        try {
            userProfiles = JSON.parse(savedProfiles);
            
            // Clean up legacy default profiles if present
            const beforeLen = userProfiles.length;
            userProfiles = userProfiles.filter(p => p.id !== '1' && p.id !== '2' && p.id !== '3');
            
            if (userProfiles.length !== beforeLen) {
                localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));
            }
        } catch(e) {
            userProfiles = [...defaultProfiles];
        }
    } else {
        userProfiles = [...defaultProfiles];
        localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));
    }
    
    if (savedActiveId && userProfiles.some(p => p.id === savedActiveId)) {
        activeProfileId = savedActiveId;
    } else if (userProfiles.length > 0) {
        activeProfileId = userProfiles[0].id;
        localStorage.setItem('global_active_profile_id', activeProfileId);
    } else {
        activeProfileId = '';
        localStorage.setItem('global_active_profile_id', '');
    }
}

// (initUserProfiles is called above before custom templates)

function getCurrentUser() {
    const user = userProfiles.find(p => p.id === activeProfileId);
    if (user) {
        return {
            name: user.name,
            phone: (user.phone && user.phone.trim()) ? user.phone.trim() : '(Line ID)',
            email: (user.email && user.email.trim()) ? user.email.trim() : 'contact@drivebrand.co.th'
        };
    }
    return { name: '(ใส่ชื่อเล่น)', phone: '(Line ID)', email: 'contact@drivebrand.co.th' };
}

// Database of outreach templates
const templates = {
    sereniz: {
        title: "💤 ชวนรีวิว Sereniz (คอม 10%)",
        badge: "TikTok Shop",
        showBudget: false,
        steps: [
            {
                label: "แนะนำตัว (Introduction)",
                filename: "sereniz-intro.txt",
                template: (ch) => `สวัสดีครับ ขออนุญาตแนะนำตัวนะครับ ${getCurrentUser().name} จากบริษัทไดร์ฟจำกัด\n\n${getCurrentUser().name} ติดตามมาจากช่อง (${ch}) ทาง Tiktok ครับ\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า เห็นทางช่องน่าสนใจทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% 📌(สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\n📸 รีวิว สไตล์คุณ ได้เลยเต็มที่\n\n❌(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nทางเราตามหา Influencer ที่สื่อมีความเกี่ยวข้องกับสินค้าของเราครับ\n\nคลิปตัวอย่างของอินฟูที่รีวิวสินค้าของทางเราครับ😊❤️\n\nhttps://vt.tiktok.com/ZSmLS9141/\nhttps://vt.tiktok.com/ZSmX2r8aa/\nhttps://vt.tiktok.com/ZSmX2SB3F/\n\n📌สินค้าของเราจะเป็นอาหารเสริมสนับสนุนการนอน Sereniz 💤 🛌นะครับ Link Tiktok โปรไฟล์ร้านของเราบน tiktok ชื่อ driveonline\n\nhttps://www.tiktok.com/@drive.officialth?_r=1&_t=ZS-96GW3KfWI8D\n\nสามารถเข้าดูสินค้าได้ที่หน้าโปรไฟล์เราก่อนตัดสินใจนะครับ หากสนใจหรือมีข้อมูลสอบถามเพิ่มเติมแจ้งกลับ ${getCurrentUser().name} ได้เลยนะครับ 🥰🙇🏻`
            },
            {
                label: "รายละเอียดสินค้า (Product Details)",
                filename: "product-detail.txt",
                template: () => `ตัวนี้จะเป็น แม็กนีเซียมปรับสมดุลการนอนครับ เป็นสินค้าตัวใหม่ของทางแบรนด์ครับ🙏🏻🙇🏻`
            },
            {
                label: "ปิดท้าย (Closing)",
                filename: "closing.txt",
                template: () => `ผมแจ้งรายละเอียดครบแล้วนะครับ หากสนใจผมสามารถส่งคำเชิญสินค้าให้ได้เลยนะครับ หลังจากตัดสินใจแล้วหากสนใจหรือไม่สนใจ ผมรบกวนแจ้งผมกลับนิดนึงครับ ขอบคุณมากๆครับ🥰🙏🏻🙇🏻`
            },
            {
                label: "ลิงก์สินค้า (Product Link)",
                filename: "product-link.txt",
                template: () => `https://vt.tiktok.com/ZS924jotvLu92-8DVQg/`
            }
        ]
    },
    contact: {
        title: "📞 ทักชวนงาน Affiliate",
        badge: "TikTok",
        showBudget: false,
        steps: [
            {
                label: "สคริปต์เสนอร่วมงาน (Outreach Script)",
                filename: "contact-outreach.txt",
                template: (ch) => `สวัสดีครับ 🙇🏻 ${getCurrentUser().name} จากบริษัทไดร์ฟครับ\n\nพอดีติดตามคอนเทนต์ของคุณใน TikTok จากช่อง (${ch}) แล้วรู้สึกว่าสไตล์ช่องน่าสนใจมากครับ 😊\n\n ตอนนี้ทางเรากำลังหา Creator ร่วมรีวิวสินค้าของแบรนด์ เลยอยากขออนุญาตสอบถามว่าพอสนใจรับงานแนว Affiliate / Commission ไหมครับ\n\nทางเราจะส่งสินค้าให้ทดลองใช้ฟรีครับ\n\nและมีค่าคอมจากยอดขายผ่าน TikTok Shop ให้ครับ ✨\n\nรีวิวในสไตล์ของตัวเองได้เต็มที่เลยครับ\n\nผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง (Instagram) แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻\n\nหากสนใจ เดี๋ยว${getCurrentUser().name}ส่งรายละเอียดเพิ่มเติมให้ได้เลยครับ 🙏🏻`
            }
        ]
    },
    gmail: {
        title: "📧 อีเมลเชิญร่วมงาน",
        badge: "Email Business",
        showBudget: false,
        steps: [
            {
                label: "จดหมายเชิญร่วมงานอย่างเป็นทางการ (Official Invitation)",
                filename: "gmail-outreach.txt",
                template: (ch) => `เรียน คุณ (${ch})\n\nสวัสดีครับ ผม (${getCurrentUser().name}) ติดต่อจาก แบรนด์ Drive บริษัทไดร์ฟจำกัดนะครับ\n\nพอดีผมมีโอกาสได้ติดตามผลงานของคุณ (${ch}) ผ่านทาง (TikTok) แล้วรู้สึกสนใจในการทำคลิปมากๆ เลยครับ เลยตั้งใจอีเมลมาทักทายและขออนุญาตขอช่องทางติดต่อ Connection เพื่อพูดคุยเกี่ยวกับงาน\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า ทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% (สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\nรีวิว สไตล์คุณ ได้เลยเต็มที่\n(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nยินดีที่ได้รู้จักอย่างเป็นทางการผ่านทาง Gmail นะครับ หากคุณ (${ch}) สามารถทักมาพูดคุยกันได้ตลอดเลยครับ ยินดีมากๆ ครับ\n\nขอให้เป็นสัปดาห์ที่ดีและราบรื่นนะครับ\n\nขอแสดงความนับถือ\n(${getCurrentUser().name})\n(ช่องทางติดต่อ Line ID : ${getCurrentUser().phone} | อีเมล : ${getCurrentUser().email})`
            }
        ]
    },
    tiktok: {
        title: "💬 ทัก DM สั้น (TikTok)",
        badge: "TikTok DM",
        showBudget: false,
        steps: [
            {
                label: "สคริปต์ทักทายด่วน (Quick DM Script)",
                filename: "tiktok-dm.txt",
                template: () => `สวัสดีครับผม ${getCurrentUser().name} จากบริษัทไดรฟ์จำกัดครับ มาติดงานรีวิวสินค้าตัวใหม่ของทางแบรนด์ ชื่อ Sereniz(เซเรไนท์) เป็นแม็กนีเซียมปรับสมดุลการนอนครับ ผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง Instagram แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻 (พอดีค้นหาไลน์ไม่เจอครับ)`
            }
        ]
    },
    buyasset: {
        title: "🪙 ซื้อสิทธิ์คลิป (มีงบจ้าง)",
        badge: "Paid Campaign",
        showBudget: true,
        steps: [
            {
                label: "แนะนำตัว & ข้อตกลง SOW (Intro & SOW)",
                filename: "buy-asset-intro.txt",
                template: (ch, budget) => `สวัสดีครับ ${getCurrentUser().name}นะครับ ติดต่อจาก แบรนด์ Drive บริษัท ไดร์ฟ จำกัด ครับ 🙏\n\nได้เห็นผลงานผ่านช่อง TikTok จากช่อง (${ch}) ทางแบรนด์จึงมีความสนใจ Asset คลิป Influencer หรือซื้อคลิป โดยการจัดทำคลิปวิดีโอรีวิวสินค้า เพื่อนำไปเผยแพร่บนช่องทางของแบรนด์โดยตรง\n(ไม่ต้องโพสต์ลงช่องทางส่วนตัวของคุณนะครับ)\n\nสินค้า: Sereniz ผลิตภัณฑ์เสริมอาหาร\n🔗 https://vt.tiktok.com/ZS9eUvXJDCM39-gqR5D/\n\n✨ รายละเอียดงาน (SOW)\n* จัดทำคลิปวิดีโอรีวิวสินค้า 1 คลิป โดยไม่ต้องใส่ Text\n* ความยาวประมาณ 1 นาที (ไม่ต่ำกว่า 45 วินาที) มีการพากย์เสียง\n* ใช้สำหรับลงทุกช่องทางของแบรนด์\n* ถ่ายทำตามบรีฟของทางแบรนด์ (สามารถปรับสไตล์ให้เหมาะกับตัวคุณได้ค่ะ)\n* ส่ง Draft แรกภายใน 3–5 วัน หลังจากได้รับสินค้า\n* ทางแบรนด์ขอสิทธิ์แก้ไขงานได้ไม่เกิน 3 ครั้ง\n\n💰Budget : ${budget}\n\nหากสนใจ สามารถแจ้งเรท / สอบถามรายละเอียดเพิ่มเติมได้เลยนะครับ\nขอบคุณมากครับ 🙏✨`
            },
            {
                label: "คำถามเช็คความพร้อม (Contract Inquiry)",
                filename: "buy-asset-question.txt",
                template: () => `สะดวกเซ็นสัญญาแจ้งงานไหมครับ`
            },
            {
                label: "สัญญาจ้างงาน (Employment Contract)",
                filename: "buy-asset-contract.txt",
                template: () => `ส่วนนี้เป็นสัญญาครับผม หากมีตรงไหนสงสัยถามผมได้เลยนะครับ`
            },
            {
                label: "ขอที่อยู่ส่งของ/สินค้า (Delivery Details)",
                filename: "buy-asset-address.txt",
                template: () => `ขอชื่อที่อยู่เบอร์โทรสำหรับส่งสินค้าหน่อยครับ`
            },
            {
                label: "ลิงก์บรีฟข้อมูลสินค้า (Canva Brief Link)",
                filename: "buy-asset-brief.txt",
                template: () => `https://www.canva.com/design/DAHCHKdovR4/kctPkJYZTbcJ14eMN8Qo7A/edit\nส่วนนี้จะเป็นบรีฟงานและข้อมูลสินค้าครับผม🙏✨`
            }
        ]
    }
};

// Detect current page file to set campaign
function getPageId() {
    const hash = window.location.hash.replace('#', '');
    if (hash && (templates[hash] || customTemplates[hash])) {
        return hash;
    }
    const filename = window.location.pathname.split('/').pop().replace('.html', '');
    return (filename === '' || filename === 'index') ? 'sereniz' : filename;
}

// Global State
let currentCampaign = getPageId();
let channelName = '';
let budgetValue = '';
let checkedStates = {};
let viewMode = 'grid';
let currentFlowStep = 0;

// Manual edits made in a card body (contenteditable), keyed by `${campaign}_${idx}`.
// A re-render (typing a channel, toggling "sent", switching profile/view) rebuilds
// the cards' innerHTML from the template, which would otherwise wipe the edit — so
// whatever the user typed here wins over the template output on every re-render.
// Session-scoped on purpose (not persisted): a reload returns to the pristine
// template, and re-saving/resetting a template clears its stale edits.
let editedTexts = {};

// Capture a manual edit as the user types so it survives the next re-render.
function handleCardEdit(idx) {
    const bodyEl = document.getElementById(`body_${idx}`);
    if (!bodyEl) return;
    editedTexts[`${currentCampaign}_${idx}`] = bodyEl.innerText;
}

// Drop any pending manual edits for a campaign so that re-saving or resetting its
// template surfaces the fresh content instead of a stale hand-edit overriding it.
function clearCampaignEdits(campaign) {
    Object.keys(editedTexts).forEach(k => {
        if (k.startsWith(`${campaign}_`)) delete editedTexts[k];
    });
}

// Build the shared app shell (sidebar + workspace + toast) once per page load.
// Keeping this markup in one place means brand/label edits only ever touch this function.
function renderAppShell() {
    if (document.querySelector('.app-layout')) return;

    document.body.insertAdjacentHTML('afterbegin', `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="brand-header">
                    <div class="brand-logo">D</div>
                    <div class="brand-info">
                        <h2>Drive Hub</h2>
                        <p>Drive Brand Co., Ltd.</p>
                    </div>
                </div>

                <div class="sidebar-scroll">
                    <div class="control-group">
                        <div class="control-title">
                            <span class="control-title-bar"></span>
                            ข้อมูลช่อง/ราคา
                        </div>

                        <div class="input-wrapper">
                            <span class="input-icon">${ic('music')}</span>
                            <input class="input-field" id="sidebarChannel" type="text" placeholder="ระบุชื่อช่อง TikTok" oninput="handleInputSync(this, 'channel')">
                        </div>

                        <div class="input-wrapper" id="budgetInputContainer">
                            <span class="input-icon">${ic('wallet')}</span>
                            <input class="input-field" id="sidebarBudget" type="text" placeholder="ระบุงบประมาณ (เช่น 500)" oninput="handleInputSync(this, 'budget')">
                        </div>
                    </div>

                    <div class="control-group">
                        <div class="control-title">
                            <span class="control-title-bar"></span>
                            รูปแบบเทมเพลต (Templates)
                        </div>

                        <div class="nav-list"></div>
                    </div>

                    <div class="info-card">
                        <strong>💡 คำแนะนำเพิ่มเติม:</strong><br>
                        1. คุณสามารถพิมพ์แก้ไขสคริปต์บนหน้าเว็บได้ทันทีก่อนคัดลอก<br>
                        2. เปลี่ยนเป็น <strong>แบบ Flow (ทีละขั้นตอน)</strong> ที่มุมขวาบน เพื่อคัดลอกข้อความทีละเสต็ปได้อย่างสะดวกรวดเร็วโดยไม่ต้องเลื่อนจอ
                    </div>
                </div>
            </aside>

            <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>

            <main class="workspace">
                <header class="workspace-header">
                    <button class="hamburger-btn" id="hamburgerBtn" onclick="toggleSidebar()" aria-label="เปิด/ปิดเมนู">
                        <span></span><span></span><span></span>
                    </button>
                    <div class="campaign-info">
                        <h1 id="activeCampaignTitle"></h1>
                    </div>

                    <div class="header-controls">
                        <div class="view-toggle">
                            <button class="view-btn" id="view-grid-btn" onclick="setViewMode('grid')">แบบตาราง</button>
                            <button class="view-btn" id="view-flow-btn" onclick="setViewMode('flow')">ทีละขั้นตอน</button>
                        </div>

                        <div class="progress-indicator">
                            <span class="progress-label" id="progressText">สถานะ: ส่งไปแล้ว 0/0 ขั้นตอน</span>
                            <div class="progress-bar-container">
                                <div class="progress-bar" id="progressBar"></div>
                            </div>
                        </div>
                    </div>
                </header>

                <div class="workspace-scroll">
                    <div class="flow-stepper" id="flowStepperContainer" style="display: none;"></div>
                    <div class="cards-grid" id="scriptCardsContainer"></div>
                </div>
            </main>
        </div>

        <div id="toast" class="toast">
            <div class="toast-icon">✓</div>
            <div class="toast-text" id="toastText">คัดลอกข้อความแล้ว</div>
        </div>
    `);
}

// Sidebar toggle: an off-canvas drawer on mobile/tablet, a collapse-to-icon-rail on desktop.
// Same button, same handler — which behavior applies depends on viewport width at click time,
// so it stays correct even if the window is resized without a reload.
const SIDEBAR_MOBILE_QUERY = '(max-width: 860px)';

function toggleSidebar() {
    if (window.matchMedia(SIDEBAR_MOBILE_QUERY).matches) {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    } else {
        toggleSidebarCollapse();
    }
}

function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
    document.body.classList.add('sidebar-lock');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    document.body.classList.remove('sidebar-lock');
}

function toggleSidebarCollapse() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const collapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('global_sidebar_collapsed', collapsed ? 'true' : 'false');
}

function restoreSidebarCollapseState() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (localStorage.getItem('global_sidebar_collapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }
}

// Initialize on window load
window.addEventListener('DOMContentLoaded', () => {
    // Build the shared sidebar/workspace/toast markup before anything else touches the DOM
    renderAppShell();
    restoreSidebarCollapseState();

    // Determine campaign from filename or hash
    currentCampaign = getPageId();

    // Load user profiles and inject user interface
    initUserProfiles();
    injectUserInterface();
    
    // Render dynamic sidebar navigation
    renderSidebarNavigation();

    // Load saved inputs globally
    channelName = localStorage.getItem('global_channel') || '';
    budgetValue = localStorage.getItem('global_budget') || '500';
    viewMode = localStorage.getItem('global_view_mode') || 'grid';

    const chInput = document.getElementById('sidebarChannel');
    const bInput = document.getElementById('sidebarBudget');
    
    if (chInput) chInput.value = channelName;
    if (bInput) bInput.value = budgetValue;

    // Set view toggle buttons
    setViewMode(viewMode);

    // Toggle budget input visibility based on campaign requirements
    const data = customTemplates[currentCampaign] || templates[currentCampaign];
    if (data) {
        toggleBudgetField(data.showBudget);
    }

    // Load checkboxes state
    const savedChecked = localStorage.getItem('global_checked_states');
    if (savedChecked) {
        try {
            checkedStates = JSON.parse(savedChecked);
        } catch(e) {}
    }

    renderActiveCampaign();
});

// Sync inputs globally via localStorage
function handleInputSync(inputEl, type) {
    const val = inputEl.value;
    if (type === 'channel') {
        channelName = val;
        localStorage.setItem('global_channel', val);
    } else if (type === 'budget') {
        budgetValue = val;
        localStorage.setItem('global_budget', val);
    }
    renderActiveCampaign();
}

// Toggle sidebar budget field display
function toggleBudgetField(show) {
    const el = document.getElementById('budgetInputContainer');
    if (el) {
        el.style.display = show ? 'block' : 'none';
    }
}

// Set View Mode (Grid vs Flow)
function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('global_view_mode', mode);

    const gridBtn = document.getElementById('view-grid-btn');
    const flowBtn = document.getElementById('view-flow-btn');
    const stepperEl = document.getElementById('flowStepperContainer');

    if (gridBtn && flowBtn) {
        if (mode === 'grid') {
            gridBtn.classList.add('active');
            flowBtn.classList.remove('active');
            if (stepperEl) stepperEl.style.display = 'none';
        } else {
            gridBtn.classList.remove('active');
            flowBtn.classList.add('active');
            if (stepperEl) stepperEl.style.display = 'flex';
        }
    }

    renderActiveCampaign();
}

// Render active campaign contents
function renderActiveCampaign() {
    const data = customTemplates[currentCampaign] || templates[currentCampaign];
    if (!data) return;

    const titleEl = document.getElementById('activeCampaignTitle');
    if (titleEl) {
        titleEl.innerHTML = `<span class="campaign-title-text">${esc(data.title)}</span><span class="campaign-badge">${esc(data.badge)}</span>`;
    }

    const container = document.getElementById('scriptCardsContainer');
    const stepperContainer = document.getElementById('flowStepperContainer');
    
    if (!container) return;
    container.innerHTML = '';
    
    if (stepperContainer) stepperContainer.innerHTML = '';

    let totalSteps = data.steps.length;
    let completedSteps = 0;

    const displayChannel = channelName.trim() || '(ชื่อช่อง)';
    let displayBudget = budgetValue.trim();
    if (!displayBudget) {
        displayBudget = '500 บาท';
    } else if (/^\d+$/.test(displayBudget)) {
        displayBudget = `${displayBudget} บาท`;
    }

    // Adjust step limits
    if (currentFlowStep >= totalSteps) {
        currentFlowStep = totalSteps - 1;
    }
    if (currentFlowStep < 0) currentFlowStep = 0;

    // Render stepper bar for Flow mode
    if (viewMode === 'flow' && stepperContainer) {
        data.steps.forEach((step, idx) => {
            const key = `${currentCampaign}_${idx}`;
            const isChecked = !!checkedStates[key];

            const stepItem = document.createElement('div');
            stepItem.className = `stepper-item ${idx === currentFlowStep ? 'active' : ''} ${isChecked ? 'completed' : ''}`;
            stepItem.onclick = () => { currentFlowStep = idx; renderActiveCampaign(); };
            stepItem.innerHTML = `
                <span class="stepper-dot"></span>
                <span>ขั้นตอนที่ ${idx + 1}</span>
            `;
            stepperContainer.appendChild(stepItem);

            if (idx < totalSteps - 1) {
                const line = document.createElement('div');
                line.className = `stepper-line ${isChecked ? 'completed' : ''}`;
                stepperContainer.appendChild(line);
            }
        });
    }

    // Dynamic grid classes
    if (viewMode === 'flow') {
        container.className = 'cards-grid single-card';
    } else {
        if (totalSteps === 1) {
            container.className = 'cards-grid single-card';
        } else {
            container.className = 'cards-grid';
        }
    }

    // Build cards
    data.steps.forEach((step, idx) => {
        const key = `${currentCampaign}_${idx}`;
        const isChecked = !!checkedStates[key];
        if (isChecked) completedSteps++;

        // In Flow view, only show the active card
        if (viewMode === 'flow' && idx !== currentFlowStep) {
            return;
        }

        const editKey = `${currentCampaign}_${idx}`;
        let rawText = '';
        if (Object.prototype.hasOwnProperty.call(editedTexts, editKey)) {
            // A manual edit takes precedence — no placeholder substitution, so the
            // text stays exactly as the user left it (the channel/budget/user spans
            // below still re-highlight any occurrences that happen to be present).
            rawText = editedTexts[editKey];
        } else if (typeof step.template === 'function') {
            rawText = step.template(displayChannel, displayBudget);
        } else {
            let t = step.templateText || '';
            t = t.replaceAll('{ชื่อคนส่ง}', getCurrentUser().name);
            t = t.replaceAll('{name}', getCurrentUser().name);
            t = t.replaceAll('{เบอร์โทร}', getCurrentUser().phone);
            t = t.replaceAll('{phone}', getCurrentUser().phone);
            t = t.replaceAll('{อีเมล}', getCurrentUser().email);
            t = t.replaceAll('{email}', getCurrentUser().email);
            t = t.replaceAll('{ชื่อช่อง}', displayChannel);
            t = t.replaceAll('{channel}', displayChannel);
            t = t.replaceAll('{งบประมาณ}', displayBudget);
            t = t.replaceAll('{budget}', displayBudget);
            rawText = t;
        }
        const escText = esc(rawText);
        let highlightedHtml = escText;
        
        // Always highlight the channel name (either typed or fallback '(ชื่อช่อง)')
        highlightedHtml = highlightedHtml.replaceAll(esc(displayChannel), `<span class="hl">${esc(displayChannel)}</span>`);
        // Same for budget (either typed or fallback '500 บาท') — kept consistent with the channel highlight above
        if (data.showBudget) {
            highlightedHtml = highlightedHtml.replaceAll(esc(displayBudget), `<span class="hl-budget">${esc(displayBudget)}</span>`);
        }
        
        // Highlight Sender details dynamically
        const currentUser = getCurrentUser();
        if (currentUser.name) {
            highlightedHtml = highlightedHtml.replaceAll(esc(currentUser.name), `<span class="hl-user">${esc(currentUser.name)}</span>`);
        }
        if (currentUser.phone) {
            highlightedHtml = highlightedHtml.replaceAll(esc(currentUser.phone), `<span class="hl-user">${esc(currentUser.phone)}</span>`);
        }
        if (currentUser.email) {
            highlightedHtml = highlightedHtml.replaceAll(esc(currentUser.email), `<span class="hl-user">${esc(currentUser.email)}</span>`);
        }

        // Link buttons builder
        let linkButtonsHtml = '';
        const urlRegex = /(https?:\/\/[^\s\n\r]+)/g;
        const urls = rawText.match(urlRegex);
        if (urls) {
            linkButtonsHtml = '<div class="card-links">';
            urls.forEach(url => {
                let iconName = 'link';
                let label = "เปิดลิงก์";
                if (url.includes("canva.com")) {
                    iconName = 'palette';
                    label = "เปิดไฟล์บรีฟ Canva";
                } else if (url.includes("tiktok.com")) {
                    iconName = 'video';
                    label = "เปิดคลิปตัวอย่าง TikTok";
                }
                linkButtonsHtml += `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="card-link-btn">${ic(iconName)}<span>${esc(label)}</span></a>`;
            });
            linkButtonsHtml += '</div>';
        }

        const card = document.createElement('div');
        
        let cardClasses = ['script-card'];
        if (isChecked) cardClasses.push('completed');
        
        // Grid span full for first step in multi-step views
        if (viewMode === 'grid' && totalSteps > 1 && idx === 0) {
            cardClasses.push('span-full');
        }
        card.className = cardClasses.join(' ');
        card.id = `card_${idx}`;
        
        let footerContent = '';
        if (viewMode === 'flow') {
            footerContent = `
                <button class="btn-secondary" onclick="prevFlowStep()" ${idx === 0 ? 'disabled' : ''}>ย้อนกลับ</button>
                <button class="btn-copy btn-large" id="copy_btn_${idx}" onclick="copyCardText(${idx}, true)">
                    ${ic('copy')}
                    คัดลอก &amp; ถัดไป
                </button>
            `;
        } else {
            footerContent = `
                <button class="btn-copy" id="copy_btn_${idx}" onclick="copyCardText(${idx}, false)">
                    ${ic('copy')}
                    คัดลอกข้อความ
                </button>
            `;
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title-group">
                    <span class="step-number">${idx + 1}</span>
                    <span class="card-title">${esc(step.label)}</span>
                </div>
                <div class="card-actions">
                    <label class="sent-indicator">
                        <input type="checkbox" class="sent-checkbox" id="check_${idx}" onchange="toggleStepStatus(${idx})" ${isChecked ? 'checked' : ''}>
                        <span>ส่งแล้ว</span>
                    </label>
                </div>
            </div>
            <div class="card-body-wrapper">
                <div class="card-body" contenteditable="true" id="body_${idx}" onfocus="expandCard(${idx})" oninput="handleCardEdit(${idx})">${highlightedHtml}</div>
                <button type="button" class="card-expand-toggle" id="expand_${idx}" onclick="toggleCardExpand(${idx})">
                    ${ic('chevron')}<span>ดูสคริปต์เต็ม</span>
                </button>
                ${linkButtonsHtml}
            </div>
            <div class="card-footer">
                ${footerContent}
            </div>
        `;

        container.appendChild(card);
    });

    updateProgress(completedSteps, totalSteps);
    applyMobileClamp();
}

// Progressive disclosure: collapse only genuinely long scripts to a few lines
// with a "show full / collapse" toggle, so the reader doesn't scroll past one
// long message to reach the next step. Applies on every viewport (desktop too);
// short scripts are left untouched.
const MOBILE_CLAMP_THRESHOLD = 200; // px of full body height above which we clamp

function applyMobileClamp() {
    document.querySelectorAll('.script-card').forEach(card => {
        const body = card.querySelector('.card-body');
        const toggle = card.querySelector('.card-expand-toggle');
        if (!body || !toggle) return;

        // Reset so scrollHeight reflects the full, unclamped content
        card.classList.remove('clampable', 'collapsed');

        if (body.scrollHeight > MOBILE_CLAMP_THRESHOLD) {
            card.classList.add('clampable', 'collapsed');
            const span = toggle.querySelector('span');
            if (span) span.textContent = 'ดูสคริปต์เต็ม';
            toggle.classList.remove('is-expanded');
        }
    });
}

function toggleCardExpand(idx) {
    const card = document.getElementById(`card_${idx}`);
    if (!card) return;
    const collapsed = card.classList.toggle('collapsed');
    const btn = document.getElementById(`expand_${idx}`);
    if (btn) {
        const span = btn.querySelector('span');
        if (span) span.textContent = collapsed ? 'ดูสคริปต์เต็ม' : 'ย่อสคริปต์';
        btn.classList.toggle('is-expanded', !collapsed);
    }
}

// Editing a collapsed card should reveal its full text first
function expandCard(idx) {
    const card = document.getElementById(`card_${idx}`);
    if (card && card.classList.contains('collapsed')) {
        toggleCardExpand(idx);
    }
}

// Re-evaluate clamping when the viewport crosses the mobile breakpoint
let _clampResizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(_clampResizeTimer);
    _clampResizeTimer = setTimeout(applyMobileClamp, 150);
});

// Escaping safety helper
// Escapes for safe interpolation into HTML — including quotes, so the same
// helper is safe inside attribute values (title="...", href="...") as well as text.
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Inline SVG icon set (Lucide-style). Stroke is currentColor, so every icon
// picks up the surrounding token colour (teal, orange, muted…) automatically,
// and size follows the wrapping element's font-size because each icon is 1em.
const ICONS = {
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    pencil: '<path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/>',
    video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    link: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    copy: '<rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>'
};
function ic(name) {
    const body = ICONS[name] || '';
    return `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Titles are free text and often start with their own emoji (e.g. "💤 Sereniz Outreach...").
// Sidebar nav rows already show a fixed slot icon, so strip a leading emoji from the title
// text to avoid showing the same (or a clashing) emoji twice in a row.
const LEADING_EMOJI_RE = new RegExp(
    '^\\p{Extended_Pictographic}(?:\\uFE0F)?(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F)?)*\\s*', 'u'
);
function stripLeadingEmoji(text) {
    return text.replace(LEADING_EMOJI_RE, '');
}

// Toggle checkboxes status
function toggleStepStatus(idx) {
    const key = `${currentCampaign}_${idx}`;
    const checkbox = document.getElementById(`check_${idx}`);
    const card = document.getElementById(`card_${idx}`);

    if (checkbox && checkbox.checked) {
        checkedStates[key] = true;
        if (card) card.classList.add('completed');
    } else {
        delete checkedStates[key];
        if (card) card.classList.remove('completed');
    }

    localStorage.setItem('global_checked_states', JSON.stringify(checkedStates));
    
    const activeData = customTemplates[currentCampaign] || templates[currentCampaign];
    let totalSteps = activeData ? activeData.steps.length : 0;
    let completedSteps = 0;
    for(let i=0; i<totalSteps; i++) {
        if (checkedStates[`${currentCampaign}_${i}`]) completedSteps++;
    }
    updateProgress(completedSteps, totalSteps);

    if (viewMode === 'flow') {
        renderActiveCampaign();
    }
}

// Flow views operations
function prevFlowStep() {
    if (currentFlowStep > 0) {
        currentFlowStep--;
        renderActiveCampaign();
    }
}

function nextFlowStep() {
    const activeData = customTemplates[currentCampaign] || templates[currentCampaign];
    const totalSteps = activeData ? activeData.steps.length : 0;
    if (currentFlowStep < totalSteps - 1) {
        currentFlowStep++;
        renderActiveCampaign();
    }
}

// Progress Bar helper
function updateProgress(completed, total) {
    const pct = total > 0 ? (completed / total) * 100 : 0;
    const pb = document.getElementById('progressBar');
    const pt = document.getElementById('progressText');
    if (pb) pb.style.width = `${pct}%`;
    if (pt) pt.innerText = `ส่งแล้ว ${completed}/${total} ขั้นตอน`;
}

// Clipboard copying
function copyCardText(idx, advanceStep = false) {
    const bodyEl = document.getElementById(`body_${idx}`);
    if (!bodyEl) return;
    
    const textToCopy = bodyEl.innerText || bodyEl.textContent;

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("คัดลอกขั้นตอนที่ " + (idx + 1) + " เรียบร้อย!");
        
        const checkbox = document.getElementById(`check_${idx}`);
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            toggleStepStatus(idx);
        }

        const btn = document.getElementById(`copy_btn_${idx}`);
        if (btn) {
            const origHtml = btn.innerHTML;
            btn.innerHTML = '✓ คัดลอกเรียบร้อย';
            btn.classList.add('copied');
            
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = origHtml;
                    btn.classList.remove('copied');
                }
            }, 2000);
        }

        if (advanceStep) {
            const activeData = customTemplates[currentCampaign] || templates[currentCampaign];
            const totalSteps = activeData ? activeData.steps.length : 0;
            if (currentFlowStep < totalSteps - 1) {
                setTimeout(() => {
                    nextFlowStep();
                }, 800);
            }
        }
    }).catch((e) => {
        console.error("Clipboard write failed:", e);
        showToast("คัดลอกไม่สำเร็จ กรุณาลองเลือกข้อความแล้วคัดลอกเอง (Ctrl+C)");
    });
}

// Toast notification helper.
// `type` picks the accent + icon so the toast reads as what it reports:
// 'success' (green ✓, default) for saves/creates, 'danger' (red trash) for deletes.
let toastTimer;
function showToast(msg, type = 'success') {
    clearTimeout(toastTimer);
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    const toastIcon = toast ? toast.querySelector('.toast-icon') : null;
    if (toastText) toastText.innerText = msg;
    if (toast) {
        toast.dataset.type = type;
        if (toastIcon) toastIcon.innerHTML = (type === 'danger') ? ic('trash') : '✓';
        toast.classList.add('show');
    }
    toastTimer = setTimeout(() => {
        if (toast) toast.classList.remove('show');
    }, 2500);
}

// Styled confirmation dialog — a Promise-based replacement for native confirm(),
// so a destructive action gets the app's own modal (blur backdrop, slide-up, brand
// tokens) instead of a jarring browser box. Resolves true on confirm, false on
// cancel / backdrop / Escape. Falls back to window.confirm if the dialog node is
// somehow missing, so a delete can never become unblockable.
function showConfirm({ title, message = '', confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', danger = false } = {}) {
    return new Promise(resolve => {
        const dialog = document.getElementById('confirmDialog');
        if (!dialog) { resolve(window.confirm(message || title || '')); return; }

        const iconEl = document.getElementById('confirmIcon');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        if (titleEl) titleEl.textContent = title || '';
        if (msgEl) {
            msgEl.textContent = message;
            msgEl.style.display = message ? 'block' : 'none';
        }
        if (okBtn) {
            okBtn.textContent = confirmText;
            okBtn.className = danger ? 'btn-danger' : 'btn-copy';
        }
        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (iconEl) {
            iconEl.className = 'confirm-icon' + (danger ? ' is-danger' : '');
            iconEl.innerHTML = ic(danger ? 'trash' : 'reset');
        }

        dialog.style.display = 'flex';
        if (okBtn) okBtn.focus();

        function cleanup(result) {
            dialog.style.display = 'none';
            if (okBtn) okBtn.removeEventListener('click', onOk);
            if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
            dialog.removeEventListener('mousedown', onBackdrop);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        }
        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        function onBackdrop(e) { if (e.target === dialog) cleanup(false); }
        function onKey(e) {
            if (e.key === 'Escape') cleanup(false);
            else if (e.key === 'Enter') cleanup(true);
        }
        if (okBtn) okBtn.addEventListener('click', onOk);
        if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
        dialog.addEventListener('mousedown', onBackdrop);
        document.addEventListener('keydown', onKey);
    });
}

// --- USER PROFILES SYSTEM LOGIC ---

// Dynamic Injection of Sender Controls and Modal
function injectUserInterface() {
    // 1. Inject Sender Profile Button in the Sidebar
    const sidebarScroll = document.querySelector('.sidebar-scroll');
    if (sidebarScroll) {
        // Check if already injected to prevent duplication
        if (!document.getElementById('sidebarUserControlGroup')) {
            const userControlGroup = document.createElement('div');
            userControlGroup.className = 'control-group';
            userControlGroup.id = 'sidebarUserControlGroup';
            userControlGroup.innerHTML = `
                <button class="btn-secondary" onclick="openUserManageModal()" title="จัดการโปรไฟล์ผู้ส่ง" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 12.5px; padding: 12px 14px; border-radius: 10px; margin-bottom: 8px;">
                    ${ic('settings')}<span class="btn-text-part">จัดการโปรไฟล์ผู้ส่ง</span>
                </button>
            `;
            // Insert at the top of sidebar scroll area
            sidebarScroll.insertBefore(userControlGroup, sidebarScroll.firstChild);
        }
    }

    // 2. Inject Modal HTML into the body if it doesn't exist
    if (!document.getElementById('userManageModal')) {
        const modalHtml = `
        <div id="userManageModal" class="modal-backdrop" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ จัดการโปรไฟล์ผู้ใช้</h3>
                    <button class="modal-close" onclick="closeUserManageModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Form to add/edit profile -->
                    <div class="profile-form">
                        <h4 id="formTitle">เพิ่มโปรไฟล์ใหม่</h4>
                        <input type="hidden" id="editProfileId" value="">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="profileName">ชื่อเล่นผู้ส่ง (ใส่ชื่อเล่น)</label>
                                <input type="text" id="profileName" class="input-field" placeholder="ระบุชื่อเล่น">
                            </div>
                            <div class="form-group">
                                <label for="profilePhone">Line ID</label>
                                <input type="text" id="profilePhone" class="input-field" placeholder="เช่น line_username">
                            </div>
                            <div class="form-group">
                                <label for="profileEmail">อีเมลสำหรับผู้ใช้</label>
                                <input type="text" id="profileEmail" class="input-field" placeholder="เช่น contact@drivebrand.co.th">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button class="btn-secondary" id="btnCancelEdit" onclick="cancelProfileEdit()" style="display:none;">ยกเลิกแก้ไข</button>
                            <button class="btn-copy" onclick="saveProfile()">บันทึกโปรไฟล์</button>
                        </div>
                    </div>

                    <!-- List of existing profiles -->
                    <div class="profile-list-container">
                        <h4>รายการโปรไฟล์ทั้งหมด (คลิกเพื่อเลือกใช้งาน)</h4>
                        <div class="profile-list" id="modalProfileList">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 3. Inject Custom Template Modal HTML into the body if it doesn't exist
    if (!document.getElementById('customTemplateModal')) {
        const customTemplateModalHtml = `
        <div id="customTemplateModal" class="modal-backdrop" style="display: none;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 id="tplModalTitle">➕ เพิ่มรูปแบบเทมเพลตใหม่</h3>
                    <button class="modal-close" onclick="closeCustomTemplateModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="profile-form" style="margin-bottom: 0;">
                        <input type="hidden" id="editTplKey" value="">
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label>ชื่อรูปแบบเทมเพลต</label>
                            <input type="text" id="tplTitle" class="input-field" placeholder="เช่น แคมเปญ Sereniz 20% หรือ ดีลซื้อลิขสิทธิ์">
                        </div>
                        <div class="form-grid tpl-form-row">
                            <div class="form-group">
                                <label>ป้ายแท็กกำกับ (Badge)</label>
                                <input type="text" id="tplBadge" class="input-field" placeholder="เช่น TikTok DM หรือ Line">
                            </div>
                            <div class="form-group tpl-checkbox-group">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
                                    <input type="checkbox" id="tplShowBudget" style="width: 16px; height: 16px;">
                                    <span>แสดงช่องระบุงบประมาณในแถบข้าง</span>
                                </label>
                            </div>
                        </div>

                        <div class="step-builder-section" style="border-top: 1px dashed var(--border); padding-top: 16px; margin-top: 16px;">
                            <h4 style="margin-bottom: 12px; font-size: 14px; color: var(--text);">ขั้นตอนและข้อความสคริปต์</h4>
                            <div id="modalStepContainer">
                                <!-- Step input groups will be added here -->
                            </div>
                            
                            <div style="display: flex; gap: 8px; margin-top: 12px;">
                                <button type="button" class="btn-secondary" onclick="addModalStepInput()" style="font-size: 12px; padding: 8px 12px; border-radius: 8px;">➕ เพิ่มขั้นตอน</button>
                                <button type="button" class="btn-secondary" id="btnRemoveModalStep" onclick="removeModalStepInput()" style="font-size: 12px; padding: 8px 12px; border-radius: 8px; display: none;">🗑️ ลบขั้นตอนล่าสุด</button>
                            </div>
                        </div>

                        <!-- Helper guide for placeholders -->
                        <div style="background-color: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 11.5px; color: var(--text-muted); line-height: 1.5;">
                            <strong>💡 คำค้นแสดงผลอัตโนมัติ (สามารถนำไปใส่ในสคริปต์ได้):</strong><br>
                            • <code>{ชื่อคนส่ง}</code> / <code>{name}</code> : จะแทนด้วยชื่อเล่นผู้ส่งที่เลือกไว้<br>
                            • <code>{เบอร์โทร}</code> / <code>{phone}</code> : จะแทนด้วย Line ID<br>
                            • <code>{อีเมล}</code> / <code>{email}</code> : จะแทนด้วยอีเมลผู้ใช้<br>
                            • <code>{ชื่อช่อง}</code> / <code>{channel}</code> : จะแทนด้วยชื่อช่องที่ป้อนในแถบข้าง<br>
                            • <code>{งบประมาณ}</code> / <code>{budget}</code> : จะแทนด้วยงบประมาณที่ป้อนในแถบข้าง
                        </div>

                        <div class="form-actions" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;">
                            <button class="btn-secondary" onclick="closeCustomTemplateModal()">ยกเลิก</button>
                            <button class="btn-copy" onclick="saveCustomTemplate()">บันทึกรูปแบบเทมเพลต</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', customTemplateModalHtml);
    }

    // 4. Inject the shared confirmation dialog (used by showConfirm) once.
    if (!document.getElementById('confirmDialog')) {
        const confirmHtml = `
        <div id="confirmDialog" class="modal-backdrop" style="display: none;">
            <div class="modal-content confirm-content">
                <div class="confirm-body">
                    <div class="confirm-icon" id="confirmIcon"></div>
                    <h3 class="confirm-title" id="confirmTitle"></h3>
                    <p class="confirm-message" id="confirmMessage"></p>
                </div>
                <div class="confirm-actions">
                    <button class="btn-secondary" id="confirmCancelBtn">ยกเลิก</button>
                    <button class="btn-danger" id="confirmOkBtn">ยืนยัน</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', confirmHtml);
    }
}

// Select active sender profile from the modal list
function selectActiveProfile(id) {
    activeProfileId = id;
    localStorage.setItem('global_active_profile_id', activeProfileId);
    renderModalProfileList();
    renderActiveCampaign();
    showToast(`เปลี่ยนผู้ส่งเป็น "${getCurrentUser().name}" เรียบร้อย`);
}

// Modal open/close actions
function openUserManageModal() {
    const modal = document.getElementById('userManageModal');
    if (modal) {
        modal.style.display = 'flex';
        renderModalProfileList();
        cancelProfileEdit(); // Reset state
    }
}

// Close modal if user clicks outside of modal content
window.addEventListener('click', (event) => {
    const modal = document.getElementById('userManageModal');
    if (event.target === modal) {
        closeUserManageModal();
    }
});

function closeUserManageModal() {
    const modal = document.getElementById('userManageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Render the list of user profiles in the management modal
function renderModalProfileList() {
    const listEl = document.getElementById('modalProfileList');
    if (!listEl) return;

    listEl.innerHTML = '';
    userProfiles.forEach(profile => {
        const isActive = profile.id === activeProfileId;
        const item = document.createElement('div');
        item.className = `profile-item ${isActive ? 'active-profile' : ''}`;
        
        const displayPhone = (profile.phone && profile.phone.trim()) ? profile.phone : '(Line ID)';
        const displayEmail = (profile.email && profile.email.trim()) ? profile.email : 'contact@drivebrand.co.th';
        
        item.innerHTML = `
            <div class="profile-item-info" style="cursor: pointer; flex: 1;" onclick="selectActiveProfile('${profile.id}')">
                <div class="profile-item-name">
                    <span>${esc(profile.name)}</span>
                    ${isActive ? '<span class="profile-active-tag">ใช้งานอยู่</span>' : ''}
                </div>
                <div class="profile-item-details">
                    Line: ${esc(displayPhone)} | 📧 ${esc(displayEmail)}
                </div>
            </div>
            <div class="profile-item-actions">
                <button class="btn-icon" title="แก้ไข" onclick="editProfile('${profile.id}')">${ic('pencil')}</button>
                <button class="btn-icon btn-delete" title="ลบ" onclick="deleteProfile('${profile.id}')">${ic('trash')}</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// Save profile (Create or Update)
function saveProfile() {
    const nameEl = document.getElementById('profileName');
    const phoneEl = document.getElementById('profilePhone');
    const emailEl = document.getElementById('profileEmail');
    const editIdEl = document.getElementById('editProfileId');

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const email = emailEl.value.trim();
    const editId = editIdEl.value;

    if (!name) {
        alert('กรุณากรอกชื่อเล่น');
        return;
    }

    if (editId) {
        // Update existing profile
        const idx = userProfiles.findIndex(p => p.id === editId);
        if (idx !== -1) {
            userProfiles[idx].name = name;
            userProfiles[idx].phone = phone;
            userProfiles[idx].email = email;
            showToast('อัปเดตโปรไฟล์เรียบร้อย');
        }
    } else {
        // Add new profile
        const newProfile = {
            id: Date.now().toString(),
            name: name,
            phone: phone,
            email: email
        };
        userProfiles.push(newProfile);
        
        // Auto-select the newly added profile as active
        activeProfileId = newProfile.id;
        localStorage.setItem('global_active_profile_id', activeProfileId);
        showToast('เพิ่มโปรไฟล์และเลือกใช้งานสำเร็จ');
    }

    // Save to localStorage
    localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));
    
    // Clear and update
    nameEl.value = '';
    phoneEl.value = '';
    emailEl.value = '';
    editIdEl.value = '';
    
    cancelProfileEdit();
    renderModalProfileList();
    renderActiveCampaign();
    closeUserManageModal();
}

// Set up form for editing
function editProfile(id) {
    const profile = userProfiles.find(p => p.id === id);
    if (!profile) return;

    document.getElementById('profileName').value = profile.name;
    document.getElementById('profilePhone').value = profile.phone;
    document.getElementById('profileEmail').value = profile.email || '';
    document.getElementById('editProfileId').value = profile.id;

    document.getElementById('formTitle').textContent = `แก้ไขโปรไฟล์: ${profile.name}`;
    document.getElementById('btnCancelEdit').style.display = 'inline-block';
}

// Cancel edit mode
function cancelProfileEdit() {
    document.getElementById('profileName').value = '';
    document.getElementById('profilePhone').value = '';
    document.getElementById('profileEmail').value = '';
    document.getElementById('editProfileId').value = '';

    document.getElementById('formTitle').textContent = 'เพิ่มโปรไฟล์ใหม่';
    document.getElementById('btnCancelEdit').style.display = 'none';
}

// Delete profile
async function deleteProfile(id) {
    const profileToDelete = userProfiles.find(p => p.id === id);
    if (!profileToDelete) return;

    if (userProfiles.length <= 1) {
        showToast('ต้องมีโปรไฟล์ผู้ส่งอย่างน้อย 1 รายการ', 'danger');
        return;
    }

    const ok = await showConfirm({
        title: 'ลบโปรไฟล์นี้?',
        message: `“${profileToDelete.name}” จะถูกลบออกจากเครื่องนี้`,
        confirmText: 'ลบโปรไฟล์',
        danger: true
    });
    if (!ok) return;

    userProfiles = userProfiles.filter(p => p.id !== id);

    // If the deleted profile was active, set active to another one
    if (id === activeProfileId) {
        activeProfileId = userProfiles[0].id;
        localStorage.setItem('global_active_profile_id', activeProfileId);
    }

    localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));

    showToast(`ลบโปรไฟล์ “${profileToDelete.name}” แล้ว`, 'danger');
    renderModalProfileList();
    renderActiveCampaign();
}

// --- CUSTOM TEMPLATE SYSTEM LOGIC ---

let modalStepCount = 0;

function openCustomTemplateModal(editKey = '') {
    const modal = document.getElementById('customTemplateModal');
    if (modal) {
        modal.style.display = 'flex';
        const titleEl = document.getElementById('tplModalTitle');
        const keyEl = document.getElementById('editTplKey');
        const container = document.getElementById('modalStepContainer');
        
        container.innerHTML = '';
        modalStepCount = 0;
        
        const hasTpl = editKey && (customTemplates[editKey] || templates[editKey]);
        if (hasTpl) {
            const temp = customTemplates[editKey] || templates[editKey];
            if (titleEl) titleEl.textContent = '✏️ แก้ไขรูปแบบเทมเพลต';
            if (keyEl) keyEl.value = editKey;
            
            document.getElementById('tplTitle').value = temp.title;
            document.getElementById('tplBadge').value = temp.badge || 'Custom';
            document.getElementById('tplShowBudget').checked = temp.showBudget || false;
            
            temp.steps.forEach(step => {
                addModalStepInput();
                // Fill details for each step
                const labelInput = document.querySelector(`#modalStepGroup_${modalStepCount} .modal-step-label`);
                const textInput = document.querySelector(`#modalStepGroup_${modalStepCount} .modal-step-text`);
                if (labelInput) labelInput.value = step.label;
                
                let text = '';
                if (typeof step.template === 'function') {
                    try {
                        text = step.template('{ชื่อช่อง}', '{งบประมาณ}');
                        // Reverse-replace current user details back to placeholders
                        const currentUser = getCurrentUser();
                        if (shouldSanitizeName(currentUser.name)) text = text.replaceAll(currentUser.name, '{ชื่อคนส่ง}');
                        if (currentUser.phone) text = text.replaceAll(currentUser.phone, '{เบอร์โทร}');
                        if (currentUser.email) text = text.replaceAll(currentUser.email, '{อีเมล}');
                    } catch(e) {
                        text = '';
                    }
                } else {
                    text = step.templateText || '';
                }
                if (textInput) textInput.value = text;
            });
        } else {
            if (titleEl) titleEl.textContent = '➕ เพิ่มรูปแบบเทมเพลตใหม่';
            if (keyEl) keyEl.value = '';
            
            document.getElementById('tplTitle').value = '';
            document.getElementById('tplBadge').value = '';
            document.getElementById('tplShowBudget').checked = false;
            
            // Add first step by default
            addModalStepInput();
        }
    }
}

function closeCustomTemplateModal() {
    const modal = document.getElementById('customTemplateModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function addModalStepInput() {
    modalStepCount++;
    const container = document.getElementById('modalStepContainer');
    
    const stepDiv = document.createElement('div');
    stepDiv.className = 'modal-step-input-group';
    stepDiv.id = `modalStepGroup_${modalStepCount}`;
    stepDiv.style.border = '1px solid var(--border)';
    stepDiv.style.borderRadius = '8px';
    stepDiv.style.padding = '12px';
    stepDiv.style.marginBottom = '10px';
    stepDiv.style.backgroundColor = 'var(--surface3)';
    
    stepDiv.innerHTML = `
        <div class="modal-step-header">
            <div class="modal-step-drag-handle" title="ลากเพื่อเปลี่ยนลำดับ">⠿</div>
            <span class="modal-step-number-label" style="font-weight: 600; font-size: 12.5px;">ขั้นตอนที่ ${modalStepCount}</span>
            <button type="button" class="modal-step-delete-btn" onclick="deleteModalStepByEl(this)" title="ลบขั้นตอนนี้">✕</button>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 12.5px;">ชื่อขั้นตอน</label>
            <input type="text" class="input-field modal-step-label" placeholder="เช่น สคริปต์เริ่มต้น หรือ ทักทายแรก" style="padding: 8px 10px; font-size: 13px;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label style="font-weight: 600; font-size: 12.5px;">เนื้อหาสคริปต์</label>
            <textarea class="input-field modal-step-text" placeholder="พิมพ์ข้อความสคริปต์ที่นี่... (ใส่ {ชื่อช่อง} หรือ {ชื่อคนส่ง} ได้)" style="min-height: 100px; padding: 10px; font-size: 13px; resize: vertical; line-height: 1.5; font-family: inherit;"></textarea>
        </div>
    `;
    container.appendChild(stepDiv);
    
    // Bind drag events to this step
    bindStepDragEvents(stepDiv);
    
    // Update remove button visibility and renumber
    updateModalStepControls();
}

function removeModalStepInput() {
    if (modalStepCount > 1) {
        const stepDiv = document.getElementById(`modalStepGroup_${modalStepCount}`);
        if (stepDiv) stepDiv.remove();
        modalStepCount--;
    }
    updateModalStepControls();
}

function deleteModalStepByEl(btn) {
    const container = document.getElementById('modalStepContainer');
    const allSteps = container.querySelectorAll('.modal-step-input-group');
    if (allSteps.length <= 1) {
        showToast('ต้องมีอย่างน้อย 1 ขั้นตอน');
        return;
    }
    const stepDiv = btn.closest('.modal-step-input-group');
    if (stepDiv) {
        stepDiv.classList.add('step-removing');
        setTimeout(() => {
            stepDiv.remove();
            modalStepCount--;
            renumberModalSteps();
            updateModalStepControls();
        }, 200);
    }
}

function updateModalStepControls() {
    const removeBtn = document.getElementById('btnRemoveModalStep');
    if (removeBtn) {
        removeBtn.style.display = modalStepCount > 1 ? 'inline-block' : 'none';
    }
    // Hide per-step delete buttons if only 1 step remains
    const container = document.getElementById('modalStepContainer');
    if (container) {
        const allDelBtns = container.querySelectorAll('.modal-step-delete-btn');
        allDelBtns.forEach(btn => {
            btn.style.display = modalStepCount > 1 ? 'flex' : 'none';
        });
    }
}

function renumberModalSteps() {
    const container = document.getElementById('modalStepContainer');
    if (!container) return;
    const allSteps = container.querySelectorAll('.modal-step-input-group');
    allSteps.forEach((step, idx) => {
        step.id = `modalStepGroup_${idx + 1}`;
        const numLabel = step.querySelector('.modal-step-number-label');
        if (numLabel) numLabel.textContent = `ขั้นตอนที่ ${idx + 1}`;
    });
    modalStepCount = allSteps.length;
}

// --- DRAG AND DROP REORDER FOR TEMPLATE STEPS ---

let draggedStep = null;
let dragPlaceholder = null;

function bindStepDragEvents(stepEl) {
    // Drag target events (fire on the draggable element)
    stepEl.addEventListener('dragstart', handleStepDragStart);
    stepEl.addEventListener('dragend', handleStepDragEnd);
    
    // Drop zone events (fire on potential drop targets)
    stepEl.addEventListener('dragover', handleStepDragOver);
    stepEl.addEventListener('dragenter', handleStepDragEnter);
    stepEl.addEventListener('dragleave', handleStepDragLeave);
    stepEl.addEventListener('drop', handleStepDrop);
    
    // Enable dragging ONLY when mousedown on the drag handle
    const handle = stepEl.querySelector('.modal-step-drag-handle');
    if (handle) {
        handle.addEventListener('mousedown', function() {
            stepEl.setAttribute('draggable', 'true');
        });
        
        // Touch support for mobile
        handle.addEventListener('touchstart', handleTouchStart, { passive: false });
    }
    
    // Remove draggable on mouseup (to keep inputs editable)
    stepEl.addEventListener('mouseup', function() {
        stepEl.removeAttribute('draggable');
    });
}

function handleStepDragStart(e) {
    draggedStep = this;
    this.classList.add('step-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.id);
    
    // Delay to allow the drag image to render
    requestAnimationFrame(() => {
        if (draggedStep) {
            draggedStep.style.opacity = '0.4';
        }
    });
}

function handleStepDragEnd(e) {
    this.classList.remove('step-dragging');
    this.style.opacity = '1';
    this.removeAttribute('draggable');
    
    // Remove placeholder
    if (dragPlaceholder && dragPlaceholder.parentNode) {
        dragPlaceholder.remove();
    }
    
    // Remove all drag-over classes
    const container = document.getElementById('modalStepContainer');
    if (container) {
        container.querySelectorAll('.step-drag-over-top, .step-drag-over-bottom').forEach(el => {
            el.classList.remove('step-drag-over-top', 'step-drag-over-bottom');
        });
    }
    
    draggedStep = null;
    dragPlaceholder = null;
    
    renumberModalSteps();
}

function handleStepDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedStep || this === draggedStep) return;
    
    const rect = this.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    if (e.clientY < midY) {
        this.classList.add('step-drag-over-top');
        this.classList.remove('step-drag-over-bottom');
    } else {
        this.classList.add('step-drag-over-bottom');
        this.classList.remove('step-drag-over-top');
    }
}

function handleStepDragEnter(e) {
    e.preventDefault();
}

function handleStepDragLeave(e) {
    this.classList.remove('step-drag-over-top', 'step-drag-over-bottom');
}

function handleStepDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedStep || this === draggedStep) return;
    
    const container = document.getElementById('modalStepContainer');
    const rect = this.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    if (e.clientY < midY) {
        container.insertBefore(draggedStep, this);
    } else {
        container.insertBefore(draggedStep, this.nextSibling);
    }
    
    this.classList.remove('step-drag-over-top', 'step-drag-over-bottom');
    
    renumberModalSteps();
    showToast('เปลี่ยนลำดับขั้นตอนแล้ว');
}

// --- TOUCH DRAG SUPPORT FOR MOBILE ---

let touchDragEl = null;
let touchClone = null;
let touchStartY = 0;
let touchOffsetY = 0;

function handleTouchStart(e) {
    e.preventDefault();
    const stepEl = this.closest('.modal-step-input-group');
    if (!stepEl) return;
    
    touchDragEl = stepEl;
    const touch = e.touches[0];
    const rect = stepEl.getBoundingClientRect();
    touchStartY = touch.clientY;
    touchOffsetY = touch.clientY - rect.top;
    
    stepEl.classList.add('step-dragging');
    
    // Create a floating clone
    touchClone = stepEl.cloneNode(true);
    touchClone.className = 'modal-step-input-group step-touch-clone';
    touchClone.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        z-index: 10000;
        opacity: 0.85;
        pointer-events: none;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        border: 1px solid var(--accent);
        border-radius: 8px;
        background-color: var(--surface3);
        transform: scale(1.02);
    `;
    document.body.appendChild(touchClone);
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!touchDragEl || !touchClone) return;
    
    const touch = e.touches[0];
    touchClone.style.top = (touch.clientY - touchOffsetY) + 'px';
    
    // Find the element under the touch
    const container = document.getElementById('modalStepContainer');
    const allSteps = container.querySelectorAll('.modal-step-input-group');
    
    allSteps.forEach(step => {
        step.classList.remove('step-drag-over-top', 'step-drag-over-bottom');
        if (step === touchDragEl) return;
        
        const rect = step.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            const midY = rect.top + rect.height / 2;
            if (touch.clientY < midY) {
                step.classList.add('step-drag-over-top');
            } else {
                step.classList.add('step-drag-over-bottom');
            }
        }
    });
}

function handleTouchEnd(e) {
    if (!touchDragEl) return;
    
    const container = document.getElementById('modalStepContainer');
    const allSteps = container.querySelectorAll('.modal-step-input-group');
    
    let dropTarget = null;
    let insertBefore = true;
    
    allSteps.forEach(step => {
        if (step.classList.contains('step-drag-over-top')) {
            dropTarget = step;
            insertBefore = true;
        } else if (step.classList.contains('step-drag-over-bottom')) {
            dropTarget = step;
            insertBefore = false;
        }
        step.classList.remove('step-drag-over-top', 'step-drag-over-bottom');
    });
    
    if (dropTarget && dropTarget !== touchDragEl) {
        if (insertBefore) {
            container.insertBefore(touchDragEl, dropTarget);
        } else {
            container.insertBefore(touchDragEl, dropTarget.nextSibling);
        }
        renumberModalSteps();
        showToast('เปลี่ยนลำดับขั้นตอนแล้ว');
    }
    
    touchDragEl.classList.remove('step-dragging');
    if (touchClone && touchClone.parentNode) {
        touchClone.remove();
    }
    
    touchDragEl = null;
    touchClone = null;
    
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
}

function editCustomTemplate(key) {
    openCustomTemplateModal(key);
}

function saveCustomTemplate() {
    const title = document.getElementById('tplTitle').value.trim();
    const badge = document.getElementById('tplBadge').value.trim() || 'Custom';
    const showBudget = document.getElementById('tplShowBudget').checked;
    const editKey = document.getElementById('editTplKey').value;
    
    if (!title) {
        alert('กรุณากรอกชื่อรูปแบบเทมเพลต');
        return;
    }
    
    // Gather steps
    const stepGroups = document.querySelectorAll('.modal-step-input-group');
    const steps = [];
    let hasEmpty = false;
    
    stepGroups.forEach((group, idx) => {
        const label = group.querySelector('.modal-step-label').value.trim() || `ขั้นตอนที่ ${idx + 1}`;
        const templateText = group.querySelector('.modal-step-text').value;
        
        if (!templateText.trim()) {
            hasEmpty = true;
        }
        
        steps.push({
            label: label,
            filename: `step-${idx + 1}.txt`,
            templateText: templateText
        });
    });
    
    if (hasEmpty) {
        alert('กรุณากรอกเนื้อหาสคริปต์ของทุกขั้นตอน');
        return;
    }
    
    let key = editKey;
    const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
    const isDefault = defaultList.includes(key);
    
    if (key && (customTemplates[key] || isDefault)) {
        // Edit existing template or override default template
        customTemplates[key] = {
            title: title,
            badge: badge,
            showBudget: showBudget,
            steps: steps
        };
        showToast(isDefault ? `แก้ไขและบันทึกค่าเทมเพลตเริ่มต้น "${title}" แล้ว` : `แก้ไขเทมเพลต "${title}" สำเร็จ!`);
    } else {
        // Create new template
        key = 'custom_' + Date.now();
        customTemplates[key] = {
            title: title,
            badge: badge,
            showBudget: showBudget,
            steps: steps
        };
        showToast(`เพิ่มเทมเพลต "${title}" สำเร็จ!`);
    }
    
    // Save to localStorage
    localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));

    // The template body just changed — discard stale card edits for this key.
    clearCampaignEdits(key);

    // Save to Supabase if configured
    if (supabaseClient) {
        saveToSupabase(key, customTemplates[key]);
    }

    // Re-render sidebar and close modal
    renderSidebarNavigation();
    closeCustomTemplateModal();
    
    // Automatically select the template
    selectCustomCampaign(key);
}

async function saveToSupabase(key, templateData) {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient
            .from('custom_templates')
            .upsert({
                id: key,
                title: templateData.title,
                badge: templateData.badge,
                show_budget: templateData.showBudget,
                steps: templateData.steps
            });
            
        if (error) throw error;
    } catch(e) {
        console.error("Error saving template to Supabase:", e);
        if (e && typeof e === 'object') {
            console.log("Supabase Save Error Details:", JSON.stringify(e));
            showToast("Supabase Save Error: " + (e.message || JSON.stringify(e)));
        } else {
            showToast("ไม่สามารถอัพเดทสคริปต์ออนไลน์ได้ (แต่บันทึกลงในเครื่องนี้แล้ว)");
        }
    }
}

async function deleteCustomTemplate(key) {
    const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
    const isDefault = defaultList.includes(key);
    const title = customTemplates[key] ? customTemplates[key].title : (templates[key] ? templates[key].title : '');

    const ok = await showConfirm(isDefault
        ? {
            title: 'คืนค่าเทมเพลตเริ่มต้น?',
            message: `“${title}” จะกลับไปเป็นค่าเริ่มต้น ข้อความที่แก้ไขไว้จะหายทั้งหมด`,
            confirmText: 'คืนค่าเริ่มต้น',
            danger: false
        }
        : {
            title: 'ลบเทมเพลตนี้?',
            message: `“${title}” จะถูกลบออกจากทุกเครื่องในทีม และกู้คืนไม่ได้`,
            confirmText: 'ลบเทมเพลต',
            danger: true
        });
    if (!ok) return;

    delete customTemplates[key];
    clearCampaignEdits(key);
    localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));

    // Delete from Supabase if configured
    if (supabaseClient) {
        deleteFromSupabase(key);
    }

    showToast(isDefault ? `คืนค่าเทมเพลต “${title}” แล้ว` : `ลบเทมเพลต “${title}” แล้ว`, isDefault ? 'success' : 'danger');

    renderSidebarNavigation();
    renderActiveCampaign();
}

async function deleteFromSupabase(key) {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient
            .from('custom_templates')
            .delete()
            .eq('id', key);
            
        if (error) throw error;
    } catch(e) {
        console.error("Error deleting template from Supabase:", e);
    }
}

function selectCustomCampaign(key) {
    currentCampaign = key;
    
    const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
    const isDefault = defaultList.includes(key);
    
    if (isDefault) {
        const isRootPage = window.location.pathname.split('/').pop().replace('.html', '') === 'index' || window.location.pathname.endsWith('/');
        const pathPrefix = isRootPage ? 'pages/' : '';
        const currentPageName = window.location.pathname.split('/').pop().replace('.html', '');
        
        if (currentPageName !== key) {
            window.location.replace(`${pathPrefix}${key}.html`);
            return;
        }
    } else {
        window.location.hash = key;
    }
    
    localStorage.setItem('global_last_campaign', key);
    
    // Render the dynamic navigation bar to show active highlight
    renderSidebarNavigation();
    
    // Toggle budget input visibility based on campaign requirements
    const data = customTemplates[key] || templates[key];
    if (data) {
        toggleBudgetField(data.showBudget);
    }
    
    // Reset flow step to 0 when switching
    currentFlowStep = 0;

    renderActiveCampaign();
    closeSidebar();
}

function renderSidebarNavigation() {
    const navList = document.querySelector('.nav-list');
    if (!navList) return;

    const isRootPage = window.location.pathname.split('/').pop().replace('.html', '') === 'index' || window.location.pathname.endsWith('/');
    const pathPrefix = isRootPage ? 'pages/' : '';

    let html = '';

    const defaultList = [
        { id: 'sereniz', label: 'ชวนรีวิว Sereniz (10%)', icon: 'moon' },
        { id: 'contact', label: 'ทักชวนงาน Affiliate', icon: 'users' },
        { id: 'gmail', label: 'อีเมลเชิญร่วมงาน', icon: 'mail' },
        { id: 'tiktok', label: 'ทัก DM สั้น (TikTok)', icon: 'message' },
        { id: 'buyasset', label: 'ซื้อสิทธิ์คลิป (มีงบ)', icon: 'bag' }
    ];

    defaultList.forEach(item => {
        const isActive = currentCampaign === item.id;
        const override = customTemplates[item.id];
        const hasCustomOverride = !!override;
        const label = hasCustomOverride ? esc(stripLeadingEmoji(override.title)) : item.label;

        html += `
            <div class="nav-btn-container ${isActive ? 'active' : ''}">
                <a href="${isActive ? '#' : `${pathPrefix}${item.id}.html`}" class="nav-btn" id="nav-${item.id}" title="${label}" onclick="${isActive ? 'event.preventDefault(); closeSidebar();' : ''}">
                    <span class="nav-btn-icon">${ic(item.icon)}</span>
                    <span class="nav-btn-label">${label}</span>
                </a>
                <button class="nav-action-btn" onclick="editCustomTemplate('${item.id}')" title="แก้ไขเทมเพลต">
                    ${ic('pencil')}
                </button>
                ${hasCustomOverride ? `
                <button class="nav-action-btn btn-reset" onclick="deleteCustomTemplate('${item.id}')" title="คืนค่าเริ่มต้น">
                    ${ic('reset')}
                </button>
                ` : `
                <div class="nav-action-placeholder"></div>
                `}
            </div>
        `;
    });

    // Only genuinely user-added templates belong here — overrides of a default
    // template id (edited in place above) must not be listed a second time.
    const defaultIds = defaultList.map(item => item.id);
    const customKeys = Object.keys(customTemplates).filter(key => !defaultIds.includes(key));
    if (customKeys.length > 0) {
        html += `<div class="sidebar-divider">เทมเพลตที่เพิ่มเอง</div>`;
        
        customKeys.forEach(key => {
            const temp = customTemplates[key];
            const isActive = currentCampaign === key;
            html += `
                <div class="nav-btn-container ${isActive ? 'active' : ''}">
                    <a href="#${key}" class="nav-btn" id="nav-${key}" onclick="selectCustomCampaign('${key}')">
                        <span class="nav-btn-icon">${ic('file')}</span>
                        <span class="nav-btn-label">${esc(stripLeadingEmoji(temp.title))}</span>
                    </a>
                    <button class="nav-action-btn" onclick="editCustomTemplate('${key}')" title="แก้ไขเทมเพลต">
                        ${ic('pencil')}
                    </button>
                    <button class="nav-action-btn btn-delete" onclick="deleteCustomTemplate('${key}')" title="ลบเทมเพลต">
                        ${ic('trash')}
                    </button>
                </div>
            `;
        });
    }

    html += `
        <button class="btn-secondary btn-add-template" onclick="openCustomTemplateModal()" title="เพิ่มรูปแบบเทมเพลต">
            ${ic('plus')}<span class="btn-text-part">เพิ่มรูปแบบเทมเพลต</span>
        </button>
    `;

    navList.innerHTML = html;
}

// Listen to URL hash change
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && customTemplates[hash]) {
        selectCustomCampaign(hash);
    }
});