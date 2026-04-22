(function (global) {
    let nodes = [];
    let animationFrameId = null;

    const CENTER_X = 50;
    const CENTER_Y = 50;
    const REPULSION_STRENGTH = 0.05;
    const CENTER_PULL = 0.005;
    const DAMPING = 0.92;

    function tick() {
        nodes.forEach(node => {
            // 1. Center Pull
            const dx = CENTER_X - node.x;
            const dy = CENTER_Y - node.y;
            node.vx += dx * CENTER_PULL;
            node.vy += dy * CENTER_PULL;

            // 2. Repulsion
            nodes.forEach(other => {
                if (node.id === other.id) return;

                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const r1 = (node.radius / window.innerWidth) * 100;
                const r2 = (other.radius / window.innerWidth) * 100;
                const minDistance = (r1 + r2) * 1.05;

                if (distance < minDistance && distance > 0) {
                    const force = (minDistance - distance) * REPULSION_STRENGTH;
                    node.vx += (dx / distance) * force;
                    node.vy += (dy / distance) * force;
                }
            });

            // 3. Application
            node.x += node.vx;
            node.y += node.vy;
            node.vx *= DAMPING;
            node.vy *= DAMPING;

            // 4. DOM Update
            if (node.element) {
                node.element.style.left = `calc(${node.x}% - ${node.radius / 2}px)`;
                node.element.style.top = `calc(${node.y}% - ${node.radius / 2}px)`;
            }
        });

        animationFrameId = requestAnimationFrame(tick);
    }

    global.DJPhysics = {
        sync: function (newNodes) {
            nodes = newNodes;
            if (!animationFrameId) tick();
        },
        stop: function () {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        },
        getNodes: () => nodes
    };

})(window);
