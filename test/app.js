class App {
    constructor() {
        this.state = {
            articles: [...ARTICLES_DB], // コピーして操作用にする
            news: NEWS_DB,
            info: INFO_DB,
            isSearching: false,
            currentView: 'home',
            sortType: 'new' // new, fav, damage
        };
        this.init();
    }

    async init() {
        this.renderHome();
        this.setupListeners();
        this.updateObserverCount();
    }

    setupListeners() {
        // Escキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.handleEsc();
        });

        // 検索やドロワー外クリックで閉じる
        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container');
            if (this.state.isSearching && searchContainer && !searchContainer.contains(e.target)) {
                this.setSearchMode(false);
            }
            const drawer = document.getElementById('drawer-menu');
            if (drawer.classList.contains('open') && !drawer.contains(e.target) && e.target.id !== 'drawer-menu' && !e.target.closest('.brand')) {
                 this.toggleDrawer(false);
            }
        });
    }

    handleEsc() {
        if (this.state.isSearching) {
            this.setSearchMode(false);
            return;
        }
        const drawer = document.getElementById('drawer-menu');
        if (drawer.classList.contains('open')) {
            this.toggleDrawer(false);
            return;
        }
        if (this.state.currentView !== 'home') {
            router.navigate('/');
        } else {
            this.toggleDrawer(true);
        }
    }

    // --- ソート機能 ---
    sortArticles(type) {
        this.state.sortType = type;
        
        // ボタンの見た目更新
        document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.sort-btn[onclick="app.sortArticles('${type}')"]`).classList.add('active');

        // ソート実行
        const sorted = [...this.state.articles];
        if (type === 'new') {
            // IDが大きい順（新しい順と仮定）
            sorted.sort((a, b) => b.id - a.id);
        } else if (type === 'fav') {
            // 管理者選(priority) > 新しい順
            sorted.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return b.id - a.id;
            });
        } else if (type === 'damage') {
            // 悲惨度(damage) > 新しい順
            sorted.sort((a, b) => {
                if (b.damage !== a.damage) return b.damage - a.damage;
                return b.id - a.id;
            });
        }
        this.renderDigest(sorted);
    }

    // --- レンダリング (Home) ---
    renderHome() {
        this.renderNewsPreview();
        this.sortArticles(this.state.sortType); // 初期ソート
    }

    // 最新3件だけ表示
    renderNewsPreview() {
        const container = document.getElementById('news-preview');
        if (!container) return;
        
        const previewNews = this.state.news.slice(0, 3);
        const newsItems = previewNews.map(n => this.createNewsItemHTML(n)).join('');

        container.innerHTML = `
            <div class="news-panel">
                <div class="news-header">
                    <span>運営からの通達</span>
                    <button class="btn btn-sm btn-outline" onclick="router.navigate('/news')" style="border:none; border-bottom:1px solid; border-radius:0;">一覧を見る</button>
                </div>
                <ul class="news-list">${newsItems}</ul>
            </div>
        `;
    }

    // 全件表示 (News View)
    renderAllNews() {
        const container = document.getElementById('news-full-list');
        if (!container) return;
        const newsItems = this.state.news.map(n => this.createNewsItemHTML(n)).join('');
        container.innerHTML = `<ul class="news-list">${newsItems}</ul>`;
    }

    createNewsItemHTML(n) {
        let badgeClass = 'badge-system';
        let badgeText = 'SYSTEM';
        if (n.type === 'alert') { badgeClass = 'badge-alert'; badgeText = 'ALERT'; }
        if (n.type === 'info') { badgeClass = 'badge-info'; badgeText = 'INFO'; }
        if (n.type === 'new') { badgeClass = 'badge-new'; badgeText = 'NEWS'; }
        if (n.type === 'power') { badgeClass = 'badge-power'; badgeText = '報酬'; }
        
        return `
        <li class="news-item">
            <span class="news-date">${n.date}</span>
            <span class="news-badge ${badgeClass}">${badgeText}</span>
            <span class="news-content">${n.content}</span>
        </li>`;
    }

    // 記事一覧描画
    renderDigest(articles) {
        const container = document.getElementById('digest-container');
        container.innerHTML = '';
        
        // グループ化せずにフラットに表示（ソート順守のため）
        // セクション分けしたい場合はここを調整
        const section = document.createElement('div');
        section.className = 'digest-section';
        
        const cardsHTML = articles.map(art => `
            <div class="card" onclick="router.navigate('/article/${art.id}')">
                <div class="mood-tracker">${art.mood}</div>
                <div class="card-meta"><span>${art.date}</span></div>
                <h3>${art.title}</h3>
                <div class="card-preview">${this.stripMD(art.content)}</div>
                <div class="tags">${art.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
            </div>
        `).join('');

        section.innerHTML = `
            <div class="section-header">
                <span class="section-title">観測記録</span>
                <div style="flex-grow:1; height:2px; background: repeating-linear-gradient(90deg, var(--c-text) 0, var(--c-text) 5px, transparent 5px, transparent 10px);"></div>
            </div>
            <div class="grid">${cardsHTML}</div>
        `;
        container.appendChild(section);
    }

    // --- 記事詳細 ---
    renderArticle(id) {
        const article = ARTICLES_DB.find(a => a.id == id);
        if (!article) return;
        const html = `
            <div class="article-header">
                <div class="article-date">${article.date} | ${article.mood}</div>
                <h1 class="article-title">${article.title}</h1>
                <div class="tags">${article.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
            </div>
            <div class="md-content">${this.parseMD(article.content)}</div>
        `;
        document.getElementById('article-render-target').innerHTML = html;
    }

    // --- 情報部屋 (Info Room) ---
    renderInfoRoom() {
        const container = document.getElementById('info-list');
        const formUrl = "https://forms.google.com/your-disclosure-form-url"; // 開示請求フォーム

        const html = this.state.info.map(info => `
            <div class="info-card">
                <div class="info-meta">
                    <span class="ssid-tag">${info.ssid}</span>
                    <span>${info.date}</span>
                </div>
                <div class="info-body">${info.content}</div>
                <div class="info-footer">
                    <button class="btn-disclosure" onclick="window.open('${formUrl}?entry.ssid=${info.ssid}', '_blank')">開示を求む</button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    // --- 佐々木ガチャ ---
    drawGacha() {
        const resultDiv = document.getElementById('gacha-result');
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = "佐々木を構成中...";
        
        // 確率計算
        const pool = GACHA_DB.items;
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selectedItem = pool[0];
        for (const item of pool) {
            if (random < item.weight) {
                selectedItem = item;
                break;
            }
            random -= item.weight;
        }

        setTimeout(() => {
            resultDiv.innerHTML = `
                <span class="gacha-rarity rarity-${selectedItem.rarity}">${selectedItem.rarity}</span>
                <strong>${selectedItem.name}</strong>
            `;
        }, 800);
    }

    // --- 佐々木検定 ---
    startQuiz() {
        // 簡易実装：ランダムに1問出す
        const q = QUIZ_DB[Math.floor(Math.random() * QUIZ_DB.length)];
        const resultDiv = document.getElementById('gacha-result'); // 結果表示枠を流用
        resultDiv.classList.remove('hidden');
        
        const optionsHtml = q.options.map((opt, i) => 
            `<button class="btn btn-sm btn-outline" style="margin:5px;" onclick="app.checkQuiz(${q.ans}, ${i})">${opt}</button>`
        ).join('<br>');

        resultDiv.innerHTML = `
            <div style="font-weight:bold; margin-bottom:10px;">Q. ${q.q}</div>
            ${optionsHtml}
        `;
    }

    checkQuiz(correctIndex, selectedIndex) {
        const resultDiv = document.getElementById('gacha-result');
        if (correctIndex === selectedIndex) {
            resultDiv.innerHTML = "<strong style='color:var(--c-danger)'>正解！</strong><br>佐々木理解度が深まりました。";
        } else {
            resultDiv.innerHTML = "<strong>不正解...</strong><br>まだまだ観測不足です。";
        }
    }

    // --- Markdown Parser (リンク機能追加) ---
    parseMD(text) {
        let processed = text
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
            .replace(/> (.*)/g, '<blockquote>$1</blockquote>');
        
        // \(URL)\ 形式のリンク変換
        processed = processed.replace(/\\\((.*?)\\\)/g, '<a href="$1" target="_blank">$1 <span style="font-size:0.8em">↗</span></a>');

        // 画像の自動埋め込み
        processed = processed.replace(
            /(^|<br>)(https?:\/\/\S+\.(?:jpg|jpeg|gif|png|webp))(?=<br>|$)/gim, 
            '$1<img src="$2" alt="Embedded Image">'
        );

        return processed;
    }

    stripMD(text) {
        return text.replace(/[*#>!\[\]\(\)\\]/g, ''); // バックスラッシュも削除
    }

    // --- Utility ---
    setSearchMode(active) {
        this.state.isSearching = active;
        if (active) {
            document.body.classList.add('is-searching');
            this.toggleDrawer(false);
        } else {
            document.body.classList.remove('is-searching');
            document.querySelector('.search-input').blur();
            this.renderHome(); // 検索解除でリセット
        }
    }

    search(query) {
        if (!query) {
            this.sortArticles(this.state.sortType);
            return;
        }
        const q = query.toLowerCase();
        // 検索時は全記事からフィルター
        const hitArticles = this.state.articles.filter(art => 
            art.title.toLowerCase().includes(q) || 
            art.content.toLowerCase().includes(q) ||
            art.tags.some(t => t.toLowerCase().includes(q))
        );
        this.renderDigest(hitArticles);
    }

    toggleDrawer(open) {
        const drawer = document.getElementById('drawer-menu');
        if (open) {
            drawer.classList.add('open');
            document.body.classList.add('is-blurred');
        } else {
            drawer.classList.remove('open');
            document.body.classList.remove('is-blurred');
            // ガチャ/クイズ結果をリセット
            document.getElementById('gacha-result').classList.add('hidden');
        }
    }

    updateObserverCount() {
        // 擬似リアルタイム観測員数 (3人 + 時間変動 + 乱数)
        const hour = new Date().getHours();
        let base = 3;
        if (hour >= 8 && hour <= 17) base = 15; // 学校にいる時間は多い
        if (hour >= 18 && hour <= 23) base = 8;
        
        const count = base + Math.floor(Math.random() * 5);
        document.getElementById('observer-num').innerText = count + "名";
    }

    // --- Transition Effect ---
    transition(callback) {
        const overlay = document.getElementById('liquid-overlay');
        const l1 = overlay.querySelector('.layer-1');
        const l2 = overlay.querySelector('.layer-2');
        const text = overlay.querySelector('.loader-text');

        l1.classList.remove('no-transition');
        l2.classList.remove('no-transition');
        
        l1.style.top = "0"; l1.style.bottom = "auto"; l1.style.height = "100%";
        l2.style.top = "0"; l2.style.bottom = "auto"; l2.style.height = "100%";
        
        setTimeout(() => { text.style.opacity = 1; text.style.transform = "translateY(0)"; }, 400);

        setTimeout(() => {
            callback();
            
            l1.classList.add('no-transition');
            l2.classList.add('no-transition');
            l1.style.top = "auto"; l1.style.bottom = "0";
            l2.style.top = "auto"; l2.style.bottom = "0";

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    l1.classList.remove('no-transition');
                    l2.classList.remove('no-transition');
                    l1.style.height = "0%";
                    l2.style.height = "0%";
                    text.style.opacity = 0;
                });
            });

        }, 1200); 
    }
}

// ルーター
const router = {
    navigate: (path) => {
        app.transition(() => {
            app.setSearchMode(false);
            app.toggleDrawer(false);

            if (path === '/') {
                app.renderHome();
                router.show('view-home');
            } else if (path === '/about') {
                router.show('view-about');
            } else if (path === '/news') {
                app.renderAllNews();
                router.show('view-news');
            } else if (path === '/info') {
                app.renderInfoRoom();
                router.show('view-info');
            } else if (path.startsWith('/article/')) {
                const id = path.split('/')[2];
                app.renderArticle(id);
                router.show('view-article');
            }
        });
    },
    back: () => router.navigate('/'),
    show: (id) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        app.state.currentView = id;
        window.scrollTo(0, 0);
    }
};

const app = new App();

