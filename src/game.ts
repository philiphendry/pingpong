export class PingPong {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private paddle1: { 
        x: number; 
        y: number; 
        width: number; 
        height: number; 
        speed: number; 
        previousPositions: Array<{y: number, moving: boolean, timestamp: number}>;
        isMoving: boolean;
    };
    private paddle2: { 
        x: number; 
        y: number; 
        width: number; 
        height: number; 
        speed: number; 
        previousPositions: Array<{y: number, moving: boolean, timestamp: number}>;
        isMoving: boolean;
    };
    private ball: { 
        x: number; 
        y: number; 
        radius: number; 
        speedX: number; 
        speedY: number;
        previousPositions: Array<{x: number, y: number, timestamp: number}>;
    };
    private keys: { [key: string]: boolean };
    private readonly TRAIL_LENGTH = 5;
    private readonly TRAIL_FADE_TIME = 2000; // Time in milliseconds for trail to fade
    private readonly BALL_TRAIL_LENGTH = 50;
    private readonly BALL_TRAIL_FADE_TIME = 1000; // Faster fade for ball trail
    private score1: number = 0;
    private score2: number = 0;
    private gameOver: boolean = false;
    private winner: number | null = null;
    private trophyScale: number = 0;
    private confettiParticles: Array<{
        x: number;
        y: number;
        speedX: number;
        speedY: number;
        color: string;
        size: number;
        rotation: number;
        rotationSpeed: number;
    }> = [];
    private readonly WINNING_SCORE = 5;
    private readonly TROPHY_SIZE = 120;
    private readonly CONFETTI_COUNT = 50;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        // Initialize paddles with position history
        this.paddle1 = {
            x: 50,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 5,
            previousPositions: [],
            isMoving: false
        };

        this.paddle2 = {
            x: this.canvas.width - 60,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 5,
            previousPositions: [],
            isMoving: false
        };

        // Initialize the position history with timestamps
        const now = Date.now();
        for (let i = 0; i < this.TRAIL_LENGTH; i++) {
            this.paddle1.previousPositions.push({
                y: this.paddle1.y, 
                moving: false,
                timestamp: now
            });
            this.paddle2.previousPositions.push({
                y: this.paddle2.y, 
                moving: false,
                timestamp: now
            });
        }

        // Initialize ball with position history
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 8,
            speedX: 5,
            speedY: 5,
            previousPositions: []
        };

        // Initialize ball position history
        for (let i = 0; i < this.BALL_TRAIL_LENGTH; i++) {
            this.ball.previousPositions.push({
                x: this.ball.x,
                y: this.ball.y,
                timestamp: now
            });
        }

        // Track pressed keys
        this.keys = {};

        // Event listeners for keyboard
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

        // Add space bar listener for restart
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameOver) {
                this.resetGame();
            }
        });

        // Start game loop
        this.gameLoop();
    }

    private updatePaddleTrail(paddle: typeof this.paddle1, newY: number): void {
        const movement = newY - paddle.y;
        paddle.isMoving = movement !== 0;

        // Add new position to history with current timestamp
        paddle.previousPositions = [
            ...paddle.previousPositions.slice(1),
            { 
                y: paddle.y, 
                moving: paddle.isMoving,
                timestamp: Date.now()
            }
        ];
        
        paddle.y = newY;
    }

    private updateBallTrail(): void {
        // Add new position to history with current timestamp
        this.ball.previousPositions = [
            ...this.ball.previousPositions.slice(1),
            {
                x: this.ball.x,
                y: this.ball.y,
                timestamp: Date.now()
            }
        ];
    }

    private update(): void {
        if (this.gameOver) {
            // Update confetti
            this.confettiParticles.forEach(particle => {
                particle.x += particle.speedX * 0.5; // Slow down horizontal movement
                particle.y += particle.speedY * 0.5; // Slow down vertical movement
                particle.speedY += 0.2; // Gravity effect
                particle.rotation += particle.rotationSpeed;
                
                // Add some wobble to horizontal movement
                particle.speedX += (Math.random() - 0.5) * 0.1;
            });

            // Remove fallen confetti
            this.confettiParticles = this.confettiParticles.filter(
                particle => particle.y < this.canvas.height
            );

            // Animate trophy
            if (this.trophyScale < 1) {
                this.trophyScale += 0.02;
            }
            return;
        }

        let newY1 = this.paddle1.y;
        let newY2 = this.paddle2.y;

        // Move paddle1 (Player 1: Q/A keys)
        if (this.keys['q']) {
            newY1 = Math.max(0, this.paddle1.y - this.paddle1.speed);
        }
        if (this.keys['a']) {
            newY1 = Math.min(this.canvas.height - this.paddle1.height, 
                this.paddle1.y + this.paddle1.speed);
        }

        // Move paddle2 (Player 2: P/L keys)
        if (this.keys['p']) {
            newY2 = Math.max(0, this.paddle2.y - this.paddle2.speed);
        }
        if (this.keys['l']) {
            newY2 = Math.min(this.canvas.height - this.paddle2.height, 
                this.paddle2.y + this.paddle2.speed);
        }

        this.updatePaddleTrail(this.paddle1, newY1);
        this.updatePaddleTrail(this.paddle2, newY2);

        // Store current position in trail before moving
        this.updateBallTrail();

        // Move ball
        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;

        // Ball collision with top and bottom walls
        if (this.ball.y + this.ball.radius > this.canvas.height || 
            this.ball.y - this.ball.radius < 0) {
            this.ball.speedY = -this.ball.speedY;
        }

        // Ball collision with paddles
        if (this.checkPaddleCollision(this.paddle1) || 
            this.checkPaddleCollision(this.paddle2)) {
            this.ball.speedX = -this.ball.speedX;
        }

        // Update scoring
        if (this.ball.x + this.ball.radius > this.canvas.width) {
            this.score1++;
            this.checkWinner();
            this.resetBall();
        } else if (this.ball.x - this.ball.radius < 0) {
            this.score2++;
            this.checkWinner();
            this.resetBall();
        }
    }

    private checkPaddleCollision(paddle: typeof this.paddle1): boolean {
        return this.ball.x + this.ball.radius > paddle.x && 
               this.ball.x - this.ball.radius < paddle.x + paddle.width &&
               this.ball.y + this.ball.radius > paddle.y && 
               this.ball.y - this.ball.radius < paddle.y + paddle.height;
    }

    private resetBall(): void {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speedX = -this.ball.speedX;
        this.ball.speedY = Math.random() * 10 - 5;

        // Reset ball trail positions
        const now = Date.now();
        this.ball.previousPositions = Array(this.BALL_TRAIL_LENGTH).fill({
            x: this.ball.x,
            y: this.ball.y,
            timestamp: now
        });
    }

    private drawPaddleWithTrail(paddle: typeof this.paddle1): void {
        const now = Date.now();

        // Draw trails
        for (let i = paddle.previousPositions.length - 1; i > 0; i--) {
            const pos = paddle.previousPositions[i];
            const prevPos = paddle.previousPositions[i - 1];
            const movement = pos.y - prevPos.y;
            
            // Calculate time-based alpha
            const timeDiff = now - pos.timestamp;
            const timeAlpha = Math.max(0, 1 - (timeDiff / this.TRAIL_FADE_TIME));
            const positionAlpha = (i / this.TRAIL_LENGTH) * 0.5;
            const alpha = Math.min(timeAlpha, positionAlpha);
            
            const trailHeight = paddle.height * 0.25;
            
            // Only draw if there was movement and trail hasn't completely faded
            if (movement !== 0 && alpha > 0) {
                this.ctx.fillStyle = `rgba(65, 105, 225, ${alpha})`; // Royal blue
                
                // Draw top trail when moving up
                if (movement < 0) {
                    this.ctx.fillRect(
                        paddle.x,
                        pos.y,
                        paddle.width,
                        trailHeight
                    );
                }
                
                // Draw bottom trail when moving down
                if (movement > 0) {
                    this.ctx.fillRect(
                        paddle.x,
                        pos.y + paddle.height - trailHeight,
                        paddle.width,
                        trailHeight
                    );
                }
            }
        }

        // Draw paddle
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    }

    private drawBallWithTrail(): void {
        const now = Date.now();

        // Draw trails
        for (let i = this.ball.previousPositions.length - 1; i > 0; i--) {
            const pos = this.ball.previousPositions[i];
            
            // Calculate time-based alpha
            const timeDiff = now - pos.timestamp;
            const timeAlpha = Math.max(0, 1 - (timeDiff / this.BALL_TRAIL_FADE_TIME));
            const positionAlpha = (i / this.BALL_TRAIL_LENGTH) * 0.5;
            const alpha = Math.min(timeAlpha, positionAlpha);
            
            // Only draw if trail hasn't completely faded
            if (alpha > 0) {
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, this.ball.radius * 0.8, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(65, 105, 225, ${alpha})`; // Royal blue
                this.ctx.fill();
                this.ctx.closePath();
            }
        }

        // Draw current ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000';
        this.ctx.fill();
        this.ctx.closePath();
    }

    private draw(): void {
        // Clear canvas
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw scores
        this.ctx.font = '48px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.score1.toString(), this.canvas.width * 0.25, 50);
        this.ctx.fillText(this.score2.toString(), this.canvas.width * 0.75, 50);

        // Draw center line
        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = '#000';
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw game elements
        this.drawPaddleWithTrail(this.paddle1);
        this.drawPaddleWithTrail(this.paddle2);
        this.drawBallWithTrail();

        // Draw victory elements if game is over
        if (this.gameOver && this.winner) {
            // Draw trophy
            const trophyX = this.winner === 1 ? 
                this.canvas.width * 0.25 : 
                this.canvas.width * 0.75;
            this.drawTrophy(trophyX, this.canvas.height * 0.5);
            
            // Draw confetti
            this.drawConfetti();

            // Draw winner text
            this.ctx.font = '32px Arial';
            this.ctx.fillStyle = '#000';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'Press SPACE to play again', 
                this.canvas.width * 0.5, 
                this.canvas.height * 0.8
            );
        }
    }

    private gameLoop(): void {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    private resetGame(): void {
        this.score1 = 0;
        this.score2 = 0;
        this.gameOver = false;
        this.winner = null;
        this.trophyScale = 0;
        this.confettiParticles = [];
        this.resetBall();
    }

    private createConfetti(x: number): void {
        for (let i = 0; i < this.CONFETTI_COUNT; i++) {
            // Calculate angle in a cone shape (between 60 and 120 degrees)
            const angle = (Math.random() * 60 + 60) * Math.PI / 180;
            const speed = Math.random() * 8 + 12; // Initial speed for "pop" effect
            
            this.confettiParticles.push({
                x,
                y: this.canvas.height * 0.5, // Start at trophy height
                speedX: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1), // Spread left and right
                speedY: -Math.sin(angle) * speed, // Negative for upward movement
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    }

    private checkWinner(): void {
        if (this.score1 >= this.WINNING_SCORE) {
            this.gameOver = true;
            this.winner = 1;
            this.createConfetti(this.canvas.width * 0.25);
        } else if (this.score2 >= this.WINNING_SCORE) {
            this.gameOver = true;
            this.winner = 2;
            this.createConfetti(this.canvas.width * 0.75);
        }
    }

    private drawTrophy(x: number, y: number): void {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(this.trophyScale, this.trophyScale);
        
        // Draw trophy emoji using TROPHY_SIZE for font size
        this.ctx.font = `${this.TROPHY_SIZE}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏆', 0, 0);
        
        this.ctx.restore();
    }

    private drawConfetti(): void {
        this.confettiParticles.forEach(particle => {
            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation);
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(
                -particle.size / 2, 
                -particle.size / 2, 
                particle.size, 
                particle.size
            );
            this.ctx.restore();
        });
    }
} 