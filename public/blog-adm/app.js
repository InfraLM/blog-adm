class BlogAdminApp {
    constructor() {
        this.apiUrl = '/blog-adm/api';
        this.authenticated = false;
        this.blocks = [];
        this.imagemPrincipalUrl = null;
        this.currentBlockImageUrl = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando Blog Admin App...');
        
        // Verificar status de autenticação
        await this.checkAuthStatus();
        
        if (this.authenticated) {
            this.showMainApp();
            this.bindElements();
            this.bindEvents();
            await this.checkHealth();
            await this.loadArticles();
        } else {
            this.showLoginScreen();
            this.bindLoginEvents();
        }
    }

    // === AUTENTICAÇÃO ===
    
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/auth-status`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            this.authenticated = data.authenticated;
            if (this.authenticated) {
                this.username = data.username;
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            this.authenticated = false;
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        if (this.username) {
            document.getElementById('userInfo').textContent = `Logado como: ${this.username}`;
        }
    }

    bindLoginEvents() {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const loginStatus = document.getElementById('loginStatus');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                this.showLoginStatus('Preencha todos os campos', 'error');
                return;
            }

            loginBtn.disabled = true;
            loginBtn.classList.add('loading');
            this.showLoginStatus('Fazendo login...', 'info');

            try {
                const response = await fetch(`${this.apiUrl}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    this.showLoginStatus('Login realizado com sucesso!', 'success');
                    this.authenticated = true;
                    this.username = data.user.username;
                    
                    setTimeout(() => {
                        this.showMainApp();
                        this.bindElements();
                        this.bindEvents();
                        this.checkHealth();
                        this.loadArticles();
                    }, 1000);
                } else {
                    this.showLoginStatus(data.message || 'Credenciais inválidas', 'error');
                }
            } catch (error) {
                console.error('Erro no login:', error);
                this.showLoginStatus('Erro de conexão. Tente novamente.', 'error');
            } finally {
                loginBtn.disabled = false;
                loginBtn.classList.remove('loading');
            }
        });
    }

    showLoginStatus(message, type) {
        const loginStatus = document.getElementById('loginStatus');
        loginStatus.textContent = message;
        loginStatus.className = `login-status ${type}`;
        loginStatus.style.display = 'block';
    }

    async logout() {
        try {
            const response = await fetch(`${this.apiUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                this.authenticated = false;
                this.username = null;
                this.showGlobalStatus('Logout realizado com sucesso', 'success');
                
                setTimeout(() => {
                    this.showLoginScreen();
                    this.bindLoginEvents();
                    // Limpar formulário
                    document.getElementById('loginForm').reset();
                    document.getElementById('loginStatus').style.display = 'none';
                }, 1000);
            }
        } catch (error) {
            console.error('Erro no logout:', error);
            this.showGlobalStatus('Erro ao fazer logout', 'error');
        }
    }

    // === ELEMENTOS E EVENTOS ===

    bindElements() {
        // Elementos do formulário
        this.tituloInput = document.getElementById('titulo');
        this.categoriaSelect = document.getElementById('categoria');
        this.autorInput = document.getElementById('autor');
        this.coautorInput = document.getElementById('coautor');
        this.resumoTextarea = document.getElementById('resumo');
        this.destaqueSelect = document.getElementById('destaque');
        this.imagemPrincipalInput = document.getElementById('imagemPrincipal');
        this.conteudoTextarea = document.getElementById('conteudo');
        this.tipoSelect = document.getElementById('tipo');
        
        // Elementos de interface
        this.blocksListDiv = document.getElementById('blocksList');
        this.previewDiv = document.getElementById('preview');
        this.articlesListDiv = document.getElementById('articlesList');
        
        // Elementos de upload
        this.uploadArea = document.getElementById('uploadArea');
        this.imagemPreview = document.getElementById('imagemPreview');
        this.imagemPreviewImg = document.getElementById('imagemPreviewImg');
        this.removeImageBtn = document.getElementById('removeImage');
        this.imagemUrl = document.getElementById('imagemUrl');
        this.resumoCount = document.getElementById('resumoCount');
        
        // Elementos de upload de bloco
        this.blockImageUpload = document.getElementById('blockImageUpload');
        this.blockUploadArea = document.getElementById('blockUploadArea');
        this.blockImageInput = document.getElementById('blockImage');
        this.blockImagePreview = document.getElementById('blockImagePreview');
        this.blockImagePreviewImg = document.getElementById('blockImagePreviewImg');
        this.removeBlockImageBtn = document.getElementById('removeBlockImage');
        this.blockImageUrl = document.getElementById('blockImageUrl');
        
        // Botões
        this.addBlockBtn = document.getElementById('addBlock');
        this.saveDraftBtn = document.getElementById('saveDraft');
        this.loadDraftBtn = document.getElementById('loadDraft');
        this.exportHtmlBtn = document.getElementById('exportHtml');
        this.clearFormBtn = document.getElementById('clearForm');
        this.publishBtn = document.getElementById('publishArticle');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    bindEvents() {
        // Eventos de logout
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Eventos de botões
        this.addBlockBtn.addEventListener('click', () => this.addBlock());
        this.saveDraftBtn.addEventListener('click', () => this.saveDraft());
        this.loadDraftBtn.addEventListener('click', () => this.loadDraft());
        this.exportHtmlBtn.addEventListener('click', () => this.exportHtml());
        this.clearFormBtn.addEventListener('click', () => this.clearForm());
        this.publishBtn.addEventListener('click', () => this.publishArticle());
        
        // Eventos de input para atualizar preview
        this.tituloInput.addEventListener('input', () => this.updatePreview());
        this.categoriaSelect.addEventListener('change', () => this.updatePreview());
        this.autorInput.addEventListener('input', () => this.updatePreview());
        this.coautorInput.addEventListener('input', () => this.updatePreview());
        this.resumoTextarea.addEventListener('input', () => {
            this.updateCharCount();
            this.updatePreview();
        });
        this.destaqueSelect.addEventListener('change', () => this.updatePreview());
        
        // Eventos de upload de imagem principal
        this.uploadArea.addEventListener('click', () => this.imagemPrincipalInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e, 'principal'));
        this.imagemPrincipalInput.addEventListener('change', (e) => this.handleImageSelect(e, 'principal'));
        this.removeImageBtn.addEventListener('click', () => this.removeImage('principal'));
        
        // Eventos de upload de imagem de bloco
        this.blockUploadArea.addEventListener('click', () => this.blockImageInput.click());
        this.blockUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.blockUploadArea.addEventListener('drop', (e) => this.handleDrop(e, 'block'));
        this.blockImageInput.addEventListener('change', (e) => this.handleImageSelect(e, 'block'));
        this.removeBlockImageBtn.addEventListener('click', () => this.removeImage('block'));
        
        // Evento para mostrar/ocultar upload de imagem de bloco
        this.tipoSelect.addEventListener('change', () => this.toggleBlockImageUpload());
        
        // Atalho Ctrl+Enter para adicionar bloco
        this.conteudoTextarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.addBlock();
            }
        });
    }

    // === UPLOAD DE IMAGENS ===

    updateCharCount() {
        const count = this.resumoTextarea.value.length;
        this.resumoCount.textContent = count;
        
        this.resumoCount.parentElement.classList.remove('warning', 'error');
        if (count > 400) {
            this.resumoCount.parentElement.classList.add('warning');
        }
        if (count > 500) {
            this.resumoCount.parentElement.classList.add('error');
        }
    }

    toggleBlockImageUpload() {
        const isImage = this.tipoSelect.value === 'image';
        this.blockImageUpload.style.display = isImage ? 'block' : 'none';
        this.conteudoTextarea.style.display = isImage ? 'none' : 'block';
        
        if (isImage) {
            this.conteudoTextarea.value = '';
        } else {
            this.removeImage('block');
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('dragover');
    }

    handleDrop(e, type) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadImage(files[0], type);
        }
    }

    handleImageSelect(e, type) {
        const file = e.target.files[0];
        if (file) {
            this.uploadImage(file, type);
        }
    }

    async uploadImage(file, type) {
        if (!file.type.startsWith('image/')) {
            this.showGlobalStatus('❌ Apenas arquivos de imagem são permitidos', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            this.showGlobalStatus('❌ Arquivo muito grande. Máximo 10MB', 'error');
            return;
        }
        
        const uploadArea = type === 'principal' ? this.uploadArea : this.blockUploadArea;
        const preview = type === 'principal' ? this.imagemPreview : this.blockImagePreview;
        const previewImg = type === 'principal' ? this.imagemPreviewImg : this.blockImagePreviewImg;
        const urlSpan = type === 'principal' ? this.imagemUrl : this.blockImageUrl;
        
        try {
            uploadArea.classList.add('upload-loading');
            this.showGlobalStatus('📤 Fazendo upload da imagem...', 'info');
            
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch(`${this.apiUrl}/upload-image`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                previewImg.src = result.image.url;
                urlSpan.textContent = result.image.url;
                preview.style.display = 'block';
                
                if (type === 'principal') {
                    this.imagemPrincipalUrl = result.image.url;
                } else {
                    this.currentBlockImageUrl = result.image.url;
                }
                
                this.showGlobalStatus('✅ Imagem enviada com sucesso!', 'success');
                this.updatePreview();
            } else {
                throw new Error(result.message || 'Erro no upload');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showGlobalStatus(`❌ Erro no upload: ${error.message}`, 'error');
        } finally {
            uploadArea.classList.remove('upload-loading');
        }
    }

    removeImage(type) {
        if (type === 'principal') {
            this.imagemPrincipalUrl = null;
            this.imagemPreview.style.display = 'none';
            this.imagemPrincipalInput.value = '';
        } else {
            this.currentBlockImageUrl = null;
            this.blockImagePreview.style.display = 'none';
            this.blockImageInput.value = '';
        }
        this.updatePreview();
    }

    // === BLOCOS DE CONTEÚDO ===

    addBlock() {
        const tipo = this.tipoSelect.value;
        const conteudo = this.conteudoTextarea.value.trim();
        
        if (tipo === 'image') {
            if (!this.currentBlockImageUrl) {
                this.showGlobalStatus('❌ Selecione uma imagem para o bloco', 'error');
                return;
            }
            
            const block = {
                type: 'image',
                content: this.currentBlockImageUrl,
                alt: 'Imagem do artigo'
            };
            
            this.blocks.push(block);
            this.updateBlocksList();
            this.updatePreview();
            
            this.removeImage('block');
            this.toggleBlockImageUpload();
            
        } else {
            if (!conteudo) {
                this.showGlobalStatus('❌ Digite o conteúdo do bloco', 'error');
                return;
            }
            
            const block = {
                type: tipo,
                content: conteudo
            };
            
            this.blocks.push(block);
            this.updateBlocksList();
            this.updatePreview();
            
            this.conteudoTextarea.value = '';
        }
        
        this.showGlobalStatus('✅ Bloco adicionado com sucesso!', 'success');
    }

    updateBlocksList() {
        if (this.blocks.length === 0) {
            this.blocksListDiv.innerHTML = '<p class="text-gray-500">Nenhum bloco adicionado</p>';
            return;
        }

        const blocksHtml = this.blocks.map((block, index) => {
            if (block.type === 'image') {
                return `
                    <div class="block-item image-block bg-white p-3 rounded border border-gray-200 mb-2">
                        <div class="flex justify-between items-start mb-2">
                            <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                IMAGEM
                            </span>
                            <div class="flex gap-2">
                                <button onclick="app.moveBlock(${index}, -1)" class="text-blue-600 hover:text-blue-800 text-sm" ${index === 0 ? 'disabled' : ''}>↑</button>
                                <button onclick="app.moveBlock(${index}, 1)" class="text-blue-600 hover:text-blue-800 text-sm" ${index === this.blocks.length - 1 ? 'disabled' : ''}>↓</button>
                                <button onclick="app.removeBlock(${index})" class="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                            </div>
                        </div>
                        <div class="block-content">
                            <img class="block-image" src="${block.content}" alt="${block.alt || 'Imagem do artigo'}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;">
                            <div class="block-text" style="font-size: 0.875rem; color: #4a5568; margin-top: 0.5rem;">
                                Imagem: ${block.content.split('/').pop()}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="block-item bg-white p-3 rounded border border-gray-200 mb-2">
                        <div class="flex justify-between items-start mb-2">
                            <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                ${block.type.toUpperCase()}
                            </span>
                            <div class="flex gap-2">
                                <button onclick="app.moveBlock(${index}, -1)" class="text-blue-600 hover:text-blue-800 text-sm" ${index === 0 ? 'disabled' : ''}>↑</button>
                                <button onclick="app.moveBlock(${index}, 1)" class="text-blue-600 hover:text-blue-800 text-sm" ${index === this.blocks.length - 1 ? 'disabled' : ''}>↓</button>
                                <button onclick="app.removeBlock(${index})" class="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                            </div>
                        </div>
                        <div class="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            ${this.escapeHtml(block.content.substring(0, 100))}${block.content.length > 100 ? '...' : ''}
                        </div>
                    </div>
                `;
            }
        }).join('');

        this.blocksListDiv.innerHTML = `
            <h3 class="text-lg font-semibold mb-3 text-gray-800">Blocos do Artigo (${this.blocks.length})</h3>
            ${blocksHtml}
        `;
    }

    moveBlock(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.blocks.length) return;
        
        [this.blocks[index], this.blocks[newIndex]] = [this.blocks[newIndex], this.blocks[index]];
        this.updateBlocksList();
        this.updatePreview();
    }

    removeBlock(index) {
        this.blocks.splice(index, 1);
        this.updateBlocksList();
        this.updatePreview();
        this.showGlobalStatus('✅ Bloco removido', 'success');
    }

    // === PREVIEW ===

    updatePreview() {
        const titulo = this.tituloInput.value.trim();
        const categoria = this.categoriaSelect.value;
        const autor = this.autorInput.value.trim();
        const coautor = this.coautorInput.value.trim();
        const resumo = this.resumoTextarea.value.trim();
        const destaque = this.destaqueSelect.value === 'true';
        
        let html = '';
        
        if (titulo) {
            html += `<h1 style="color: #2d3748; margin-bottom: 1rem;">${titulo}</h1>`;
        }
        
        if (this.imagemPrincipalUrl) {
            html += `<div class="imagem-principal" style="margin-bottom: 1.5rem;">
                <img src="${this.imagemPrincipalUrl}" alt="${titulo}" style="width: 100%; height: auto; border-radius: 8px;">
            </div>`;
        }
        
        if (resumo) {
            html += `<div class="resumo" style="background: #f7fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <p><strong>Resumo:</strong> ${resumo}</p>
            </div>`;
        }
        
        this.blocks.forEach(block => {
            if (block.type === 'image') {
                html += `<div class="imagem-bloco" style="margin: 1.5rem 0;">
                    <img src="${block.content}" alt="${block.alt || 'Imagem do artigo'}" style="width: 100%; height: auto; border-radius: 8px;">
                </div>`;
            } else {
                html += `<${block.type} style="margin-bottom: 1rem;">${block.content}</${block.type}>`;
            }
        });
        
        if (autor || categoria || destaque) {
            html += `<div class="autor-info" style="margin-top: 2rem; padding: 1rem; background: #f7fafc; border-radius: 8px;">`;
            
            if (autor) {
                html += `<p><strong>Autor:</strong> ${autor}`;
                if (coautor) {
                    html += ` | <strong>Co-autor:</strong> ${coautor}`;
                }
                html += `</p>`;
            }
            
            if (categoria) {
                html += `<p><strong>Categoria:</strong> ${categoria}</p>`;
            }
            
            if (destaque) {
                html += `<p><strong>✨ Artigo em Destaque</strong></p>`;
            }
            
            html += `</div>`;
        }
        
        this.previewDiv.innerHTML = html || '<p class="text-gray-500">O preview aparecerá aqui conforme você adiciona conteúdo</p>';
    }

    // === API CALLS ===

    async checkHealth() {
        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            this.updateConnectionStatus('✅ Conectado ao servidor', 'success');
        } catch (error) {
            console.error('Erro no health check:', error);
            this.updateConnectionStatus('❌ Erro de conexão', 'error');
        }
    }

    async loadArticles() {
        try {
            const response = await fetch(`${this.apiUrl}/articles`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderArticles(data.articles);
            } else {
                this.articlesListDiv.innerHTML = '<p class="text-red-500">Erro ao carregar artigos</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar artigos:', error);
            this.articlesListDiv.innerHTML = '<p class="text-red-500">Erro de conexão</p>';
        }
    }

    renderArticles(articles) {
        if (!articles || articles.length === 0) {
            this.articlesListDiv.innerHTML = '<p class="text-gray-500">Nenhum artigo encontrado</p>';
            return;
        }

        const articlesHtml = articles.map(article => `
            <div class="article-item bg-white p-4 rounded border border-gray-200 mb-3">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800 mb-1">${article.titulo}</h4>
                        <div class="text-sm text-gray-600 mb-2">
                            <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                                ${article.categoria}
                            </span>
                            ${article.destaque ? '<span class="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mr-2">⭐ Destaque</span>' : ''}
                        </div>
                        <p class="text-sm text-gray-600">
                            <strong>Autor:</strong> ${article.autor}
                            ${article.coautor ? ` | <strong>Co-autor:</strong> ${article.coautor}` : ''}
                        </p>
                        ${article.resumo ? `<p class="text-sm text-gray-500 mt-1">${article.resumo.substring(0, 100)}...</p>` : ''}
                        <p class="text-xs text-gray-400 mt-2">
                            ID: ${article.id} | Criado: ${new Date(article.created_at).toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                    ${article.imagem_principal ? `
                        <div class="ml-4">
                            <img src="${article.imagem_principal}" alt="Imagem do artigo" 
                                 style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px;">
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        this.articlesListDiv.innerHTML = `
            <h3 class="text-lg font-semibold mb-3 text-gray-800">Artigos Recentes (${articles.length})</h3>
            ${articlesHtml}
        `;
    }

    async publishArticle() {
        const titulo = this.tituloInput.value.trim();
        const categoria = this.categoriaSelect.value;
        const autor = this.autorInput.value.trim();
        const coautor = this.coautorInput.value.trim();
        const resumo = this.resumoTextarea.value.trim();
        const destaque = this.destaqueSelect.value === 'true';

        // Validações
        if (!titulo) {
            this.showGlobalStatus('❌ Título é obrigatório', 'error');
            this.tituloInput.focus();
            return;
        }

        if (!categoria) {
            this.showGlobalStatus('❌ Categoria é obrigatória', 'error');
            this.categoriaSelect.focus();
            return;
        }

        if (!autor) {
            this.showGlobalStatus('❌ Autor é obrigatório', 'error');
            this.autorInput.focus();
            return;
        }

        if (this.blocks.length === 0) {
            this.showGlobalStatus('❌ Adicione pelo menos um bloco de conteúdo', 'error');
            this.conteudoTextarea.focus();
            return;
        }

        // Gerar HTML do conteúdo
        let contentHtml = '';
        
        if (this.imagemPrincipalUrl) {
            contentHtml += `<div class="imagem-principal">
                <img src="${this.imagemPrincipalUrl}" alt="${titulo}" style="width: 100%; height: auto; margin-bottom: 1rem;">
            </div>\n\n`;
        }
        
        if (resumo) {
            contentHtml += `<div class="resumo">
                <p><strong>Resumo:</strong> ${resumo}</p>
            </div>\n\n`;
        }
        
        this.blocks.forEach(block => {
            if (block.type === 'image') {
                contentHtml += `<div class="imagem-bloco">
                    <img src="${block.content}" alt="${block.alt || 'Imagem do artigo'}" style="width: 100%; height: auto; margin: 1rem 0;">
                </div>\n\n`;
            } else {
                contentHtml += `<${block.type}>${block.content}</${block.type}>\n\n`;
            }
        });

        const articleData = {
            titulo: titulo,
            categoria: categoria,
            autor: autor,
            coautor: coautor,
            resumo: resumo,
            destaque: destaque,
            imagem_principal: this.imagemPrincipalUrl,
            content: contentHtml
        };

        try {
            this.showGlobalStatus('🔄 Publicando artigo...', 'info');
            this.publishBtn.disabled = true;

            const response = await fetch(`${this.apiUrl}/articles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(articleData)
            });

            const result = await response.json();

            if (result.success) {
                this.showGlobalStatus(result.message, 'success');
                
                setTimeout(() => {
                    this.clearForm();
                    this.loadArticles();
                }, 2000);
            } else {
                this.showGlobalStatus('❌ ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao publicar artigo:', error);
            this.showGlobalStatus('❌ Erro ao publicar artigo: ' + error.message, 'error');
        } finally {
            this.publishBtn.disabled = false;
        }
    }

    // === UTILITÁRIOS ===

    updateConnectionStatus(message, type) {
        const statusDiv = document.getElementById('connectionStatus');
        statusDiv.textContent = message;
        statusDiv.className = `status-indicator ${type}`;
    }

    showGlobalStatus(message, type) {
        const statusDiv = document.getElementById('globalStatus');
        statusDiv.textContent = message;
        statusDiv.className = `global-status ${type}`;
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearForm() {
        this.tituloInput.value = '';
        this.categoriaSelect.value = '';
        this.autorInput.value = '';
        this.coautorInput.value = '';
        this.resumoTextarea.value = '';
        this.destaqueSelect.value = 'false';
        this.conteudoTextarea.value = '';
        this.tipoSelect.value = 'p';
        
        this.blocks = [];
        this.imagemPrincipalUrl = null;
        this.currentBlockImageUrl = null;
        
        this.removeImage('principal');
        this.removeImage('block');
        this.toggleBlockImageUpload();
        
        this.updateBlocksList();
        this.updatePreview();
        this.updateCharCount();
        
        this.showGlobalStatus('✅ Formulário limpo', 'success');
    }

    saveDraft() {
        const draft = {
            titulo: this.tituloInput.value,
            categoria: this.categoriaSelect.value,
            autor: this.autorInput.value,
            coautor: this.coautorInput.value,
            resumo: this.resumoTextarea.value,
            destaque: this.destaqueSelect.value,
            imagemPrincipal: this.imagemPrincipalUrl,
            blocks: this.blocks,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('blog-admin-draft', JSON.stringify(draft));
        this.showGlobalStatus('✅ Rascunho salvo', 'success');
    }

    loadDraft() {
        const draft = localStorage.getItem('blog-admin-draft');
        if (!draft) {
            this.showGlobalStatus('❌ Nenhum rascunho encontrado', 'error');
            return;
        }

        try {
            const data = JSON.parse(draft);
            
            this.tituloInput.value = data.titulo || '';
            this.categoriaSelect.value = data.categoria || '';
            this.autorInput.value = data.autor || '';
            this.coautorInput.value = data.coautor || '';
            this.resumoTextarea.value = data.resumo || '';
            this.destaqueSelect.value = data.destaque || 'false';
            
            this.blocks = data.blocks || [];
            this.imagemPrincipalUrl = data.imagemPrincipal || null;
            
            if (this.imagemPrincipalUrl) {
                this.imagemPreviewImg.src = this.imagemPrincipalUrl;
                this.imagemUrl.textContent = this.imagemPrincipalUrl;
                this.imagemPreview.style.display = 'block';
            }
            
            this.updateBlocksList();
            this.updatePreview();
            this.updateCharCount();
            
            this.showGlobalStatus('✅ Rascunho carregado', 'success');
        } catch (error) {
            console.error('Erro ao carregar rascunho:', error);
            this.showGlobalStatus('❌ Erro ao carregar rascunho', 'error');
        }
    }

    exportHtml() {
        const titulo = this.tituloInput.value.trim() || 'Artigo sem título';
        const html = this.generateFullHtml();
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showGlobalStatus('✅ HTML exportado', 'success');
    }

    generateFullHtml() {
        const titulo = this.tituloInput.value.trim();
        const categoria = this.categoriaSelect.value;
        const autor = this.autorInput.value.trim();
        const coautor = this.coautorInput.value.trim();
        const resumo = this.resumoTextarea.value.trim();
        const destaque = this.destaqueSelect.value === 'true';
        
        let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .imagem-principal img, .imagem-bloco img { max-width: 100%; height: auto; }
        .resumo { background: #f7fafc; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
        .autor-info { margin-top: 2rem; padding: 1rem; background: #f7fafc; border-radius: 8px; }
    </style>
</head>
<body>`;

        if (titulo) {
            html += `<h1>${titulo}</h1>`;
        }
        
        if (this.imagemPrincipalUrl) {
            html += `<div class="imagem-principal">
                <img src="${this.imagemPrincipalUrl}" alt="${titulo}">
            </div>`;
        }
        
        if (resumo) {
            html += `<div class="resumo">
                <p><strong>Resumo:</strong> ${resumo}</p>
            </div>`;
        }
        
        this.blocks.forEach(block => {
            if (block.type === 'image') {
                html += `<div class="imagem-bloco">
                    <img src="${block.content}" alt="${block.alt || 'Imagem do artigo'}">
                </div>`;
            } else {
                html += `<${block.type}>${block.content}</${block.type}>`;
            }
        });
        
        if (autor || categoria || destaque) {
            html += `<div class="autor-info">`;
            
            if (autor) {
                html += `<p><strong>Autor:</strong> ${autor}`;
                if (coautor) {
                    html += ` | <strong>Co-autor:</strong> ${coautor}`;
                }
                html += `</p>`;
            }
            
            if (categoria) {
                html += `<p><strong>Categoria:</strong> ${categoria}</p>`;
            }
            
            if (destaque) {
                html += `<p><strong>✨ Artigo em Destaque</strong></p>`;
            }
            
            html += `</div>`;
        }
        
        html += `</body></html>`;
        return html;
    }
}

// Inicializar aplicação
const app = new BlogAdminApp();
