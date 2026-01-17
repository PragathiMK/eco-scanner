class UserManager {
    constructor() {
        this.user = this.loadUser();
        this.updateUI();
    }

    loadUser() {
        const stored = localStorage.getItem('ecoGuardianUser');
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    }

    saveUser() {
        if (this.user) {
            localStorage.setItem('ecoGuardianUser', JSON.stringify(this.user));
            this.updateUI();
        }
    }

    register(username) {
        this.user = {
            username: username,
            totalKarma: 0,
            itemsAudited: 0,
            plasticsSorted: 0,
            rank: 'Eco-Cadet',
            level: 1,
            avatar: null,
            badges: [],
            history: [] // {date: 'ISO', type: 'recyclables'}
        };
        this.saveUser();
        return this.user;
    }

    login(username) {
        let existing = this.loadUser();
        if (existing && existing.username === username) {
            this.user = existing;
            if (!this.user.badges) this.user.badges = [];
        } else {
            return this.register(username);
        }
        this.updateUI();
        return this.user;
    }

    updateKarma(karmaGain) {
        if (!this.user) return;

        this.user.totalKarma += karmaGain;
        this.user.itemsAudited++;

        let oldLevel = this.user.level;

        // Leveling based on total karma
        if (this.user.totalKarma >= 500) {
            this.user.rank = "Earth Guardian";
            this.user.level = 10;
        } else if (this.user.totalKarma >= 150) {
            this.user.rank = "Waste Warrior";
            this.user.level = 5;
        } else if (this.user.totalKarma >= 30) {
            this.user.rank = "Sorting Scout";
            this.user.level = Math.max(1, Math.floor(this.user.totalKarma / 30));
        } else {
            this.user.rank = "Eco-Cadet";
            this.user.level = 0;
        }

        this.checkBadges();

        if (this.user.level > oldLevel) {
            this.levelUpEffect();
        }

        this.saveUser();
        this.updateUI();
    }

    checkBadges() {
        if (!this.user.badges) this.user.badges = [];

        const badges = [
            { id: 'karma_100', title: 'Karma Champion', check: (u) => u.totalKarma >= 100, icon: '⚡' },
            { id: 'items_50', title: 'Scanner Pro', check: (u) => u.itemsAudited >= 50, icon: '🔍' },
            { id: 'plastic_20', title: 'Plastic Slayer', check: (u) => u.plasticsSorted >= 20, icon: '♻️' },
            { id: 'level_5', title: 'Elite Auditor', check: (u) => u.level >= 5, icon: '🎖️' }
        ];

        let newUnlock = false;
        badges.forEach(badge => {
            if (!this.user.badges.includes(badge.id) && badge.check(this.user)) {
                this.user.badges.push(badge.id);
                this.showUnlockNotification(badge);
                newUnlock = true;
            }
        });

        if (newUnlock) this.saveUser();
    }

    showUnlockNotification(badge) {
        alert(`BADGE UNLOCKED: ${badge.title} ${badge.icon}`);
    }

    levelUpEffect() {
        const badge = document.querySelector('.rank-badge');
        if (badge) {
            badge.classList.add('level-up-anim');
            setTimeout(() => badge.classList.remove('level-up-anim'), 1000);
        }
        alert(`LEVEL UP! You are now Level ${this.user.level}`);
    }

    setAvatar(avatar) {
        if (!this.user) return;
        this.user.avatar = avatar;
        this.saveUser();
        this.updateUI();
    }

    updateUI() {
        if (!this.user) return;

        const nameDisplay = document.getElementById('user-name-display');
        if (nameDisplay) nameDisplay.innerText = this.user.username;

        const avatarImg = document.getElementById('user-avatar-img');
        const avatarEmoji = document.getElementById('user-avatar-large');

        if (this.user.avatar) {
            if (this.user.avatar.includes('.')) {
                if (avatarImg) { avatarImg.src = this.user.avatar; avatarImg.classList.remove('hidden'); }
                if (avatarEmoji) avatarEmoji.classList.add('hidden');
            } else {
                if (avatarImg) avatarImg.classList.add('hidden');
                if (avatarEmoji) { avatarEmoji.innerText = this.user.avatar; avatarEmoji.classList.remove('hidden'); }
            }
        } else {
            if (avatarEmoji) { avatarEmoji.innerText = '👤'; avatarEmoji.classList.remove('hidden'); }
            if (avatarImg) avatarImg.classList.add('hidden');
        }

        const rankVal = document.querySelector('#stat-rank .value');
        if (rankVal) rankVal.innerText = this.user.rank;

        const rankBadge = document.querySelector('#stat-rank .rank-badge');
        if (rankBadge) rankBadge.innerText = 'LVL ' + this.user.level;

        // Update Badges with CSS Structure
        const badgeGrid = document.getElementById('badge-grid');
        if (badgeGrid) {
            const definitions = [
                { id: 'reps_100', title: 'Power Mover', icon: '⚡' },
                { id: 'co2_1kg', title: 'O2 Hero', icon: '🌳' },
                { id: 'waste_10', title: 'Shield Core', icon: '🛡️' },
                { id: 'level_5', title: 'Elite Sentry', icon: '🎖️' }
            ];

            badgeGrid.innerHTML = '';
            definitions.forEach(badge => {
                const isUnlocked = this.user.badges && this.user.badges.includes(badge.id);
                const div = document.createElement('div');
                div.className = `badge-holo ${isUnlocked ? 'unlocked' : 'locked'}`;
                div.innerHTML = `
                    <div class="badge-icon">${badge.icon}</div>
                    <div class="badge-label">${badge.title}</div>
                    ${!isUnlocked ? '<div class="badge-lock"></div>' : ''}
                `;
                badgeGrid.appendChild(div);
            });
        }
    }

    isLoggedIn() {
        return !!this.user;
    }
}
