(function (global) {

    // --- Helpers ---

    function calculateSize(votes, maxVotes) {
        const minSize = 90;
        const maxSize = 220;
        if (!maxVotes || maxVotes === 0) return minSize;
        return minSize + ((votes / maxVotes) * (maxSize - minSize));
    }

    function getColor(index) {
        const colors = [
            'linear-gradient(135deg, rgba(255, 0, 85, 0.4), rgba(112, 0, 255, 0.4))',
            'linear-gradient(135deg, rgba(0, 221, 255, 0.4), rgba(0, 85, 255, 0.4))',
            'linear-gradient(135deg, rgba(255, 204, 0, 0.4), rgba(255, 85, 0, 0.4))',
            'linear-gradient(135deg, rgba(0, 255, 153, 0.4), rgba(0, 204, 255, 0.4))',
            'linear-gradient(135deg, rgba(255, 0, 238, 0.4), rgba(135, 10, 200, 0.4))'
        ];
        return colors[index % colors.length];
    }

    function updateAuthUI() {
        const user = global.DJAuth?.getUser();
        const authBtn = document.getElementById('authBtn');
        const authOverlay = document.getElementById('authOverlay');

        if (authBtn) {
            authBtn.textContent = user ? 'Logout' : 'Login';
        }

        if (user) {
            authOverlay?.classList.remove('visible');
            if (global.DJAuth.isAdmin()) {
                document.body.classList.add('is-admin');
            } else {
                document.body.classList.remove('is-admin');
            }
        } else {
            document.body.classList.remove('is-admin');
            // Force login overlay on voting page
            const isVotePage = window.location.pathname.includes('vote.html') || document.getElementById('searchInput');
            if (isVotePage) {
                authOverlay?.classList.add('visible');
            }
        }
    }

    /**
     * Shared helper to create a standard song list item (Search/Genre lists)
     */
    function createSongListItem(song, className, onVote, onUnvote) {
        const hasVotedThis = global.DJData?.hasUserVoted(song.id);
        console.log(`UI: Creating song item for "${song.title}" (ID: ${song.id}), hasVoted: ${hasVotedThis}, onUnvote: ${!!onUnvote}`);

        const el = document.createElement('div');
        el.className = `${className} ${hasVotedThis ? 'voted' : ''}`;
        el.innerHTML = `
            <div class="mini-cover"></div>
            <div class="result-info">
                <div class="result-title-row">
                    <span class="result-name">${song.title}</span>
                    ${hasVotedThis ? `
                        <span class="voted-badge">VOTED</span> 
                        <button class="unvote-btn" title="Remove Vote">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>` : ''}
                </div>
                <span class="result-artist">${song.artist}</span>
            </div>
            <span class="result-votes">${song.votes} v</span>
        `;

        const coverEl = el.querySelector('.mini-cover');
        if (global.DJData?.fetchArtwork) {
            global.DJData.fetchArtwork(song).then(url => {
                if (url && coverEl) coverEl.style.backgroundImage = `url(${url})`;
            });
        }

        const unvoteBtn = el.querySelector('.unvote-btn');
        if (unvoteBtn && onUnvote) {
            unvoteBtn.onclick = (e) => {
                e.stopPropagation();
                onUnvote(song.id);
            };
        }

        if (onVote) {
            if (hasVotedThis) {
                el.style.cursor = 'default';
            } else {
                el.onclick = () => onVote(song.id);
            }
        }

        return el;
    }

    // --- Module Export ---

    global.DJUI = {
        renderBubbles: function (container, topSongs, onVoteCallback, onResetCallback) {
            updateAuthUI();
            const maxVotes = Math.max(...topSongs.map(s => s.votes));
            const currentNodes = global.DJPhysics ? global.DJPhysics.getNodes() : [];
            const newNodes = [];

            topSongs.forEach((song, index) => {
                let node = currentNodes.find(n => n.id === song.id);
                const size = calculateSize(song.votes, maxVotes);
                const color = getColor(index);

                if (node) {
                    node.radius = size;
                    node.element.style.width = `${size}px`;
                    node.element.style.height = `${size}px`;
                    node.element.querySelector('.votes').textContent = song.votes;
                    newNodes.push(node);
                } else {
                    const bubble = document.createElement('div');
                    bubble.className = 'bubble';
                    bubble.style.width = `${size}px`;
                    bubble.style.height = `${size}px`;
                    bubble.style.setProperty('--bg', color);

                    bubble.innerHTML = `
                        <div class="bubble-cover"></div>
                        <span class="title">${song.title}</span>
                        <span class="artist">${song.artist}</span>
                        <span class="votes">${song.votes}</span>
                    `;

                    const coverEl = bubble.querySelector('.bubble-cover');
                    if (global.DJData?.fetchArtwork) {
                        global.DJData.fetchArtwork(song).then(url => {
                            if (url && coverEl) coverEl.style.backgroundImage = `url(${url})`;
                        });
                    }

                    bubble.onclick = () => {
                        if (bubble.classList.contains('exploding')) return;
                        if (!global.DJAuth.isAdmin()) return; // Only admin can play/explode
                        bubble.classList.add('exploding');
                        setTimeout(() => onResetCallback?.(song.id), 550);
                    };

                    container.appendChild(bubble);

                    newNodes.push({
                        id: song.id,
                        x: 40 + Math.random() * 20,
                        y: 40 + Math.random() * 20,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        radius: size,
                        element: bubble
                    });
                }
            });

            currentNodes.forEach(node => {
                if (!newNodes.find(n => n.id === node.id)) {
                    node.element.remove();
                }
            });

            if (global.DJPhysics) global.DJPhysics.sync(newNodes);
        },

        renderSearchResults: function (container, results, onVoteCallback, onUnvoteCallback) {
            container.innerHTML = '';
            if (!results?.length) {
                container.classList.remove('visible');
                return;
            }

            container.classList.add('visible');
            results.slice(0, 5).forEach(song => {
                container.appendChild(createSongListItem(song, 'result-item', onVoteCallback, onUnvoteCallback));
            });
        },

        renderList: function (container, songsToRender, title, onVoteCallback, onUnvoteCallback) {
            updateAuthUI();
            if (!container) return;

            const header = container.previousElementSibling;
            if (header?.tagName === 'H3') header.textContent = title;

            container.innerHTML = '';
            songsToRender.forEach(song => {
                container.appendChild(createSongListItem(song, 'trending-item', onVoteCallback, onUnvoteCallback));
            });
        },

        renderNowPlaying: function (container, song) {
            if (!container) return;

            if (!song) {
                container.classList.remove('visible');
                setTimeout(() => {
                    if (!container.classList.contains('visible')) container.innerHTML = '';
                }, 500);
                return;
            }

            if (container.dataset.playingId === String(song.id)) return;
            container.dataset.playingId = song.id;

            container.innerHTML = `
                <div class="np-label">NOW PLAYING</div>
                <div class="np-image" id="npCover"></div>
                <div class="np-track">
                    <div class="np-title">${song.title}</div>
                    <div class="np-artist">${song.artist}</div>
                </div>
                <div class="np-visualizer">
                    <span></span><span></span><span></span><span></span>
                </div>
            `;

            const coverEl = container.querySelector('#npCover');
            if (global.DJData?.fetchArtwork) {
                global.DJData.fetchArtwork(song).then(url => {
                    if (url && coverEl) coverEl.style.backgroundImage = `url(${url})`;
                });
            }

            container.classList.add('visible');
        }
    };

})(window);
