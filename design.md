# Videira App - Design Document

## 1. Visão Geral

Aplicativo mobile para gerenciamento de células da Igreja Videira, destinado aos perfis:
- **Pastor**: Visão geral de discipuladores e células
- **Discipulador**: Acompanhamento de líderes e células
- **Líder de Célula**: Gestão completa da célula
- **Participante**: Visualização de informações e participação

## 2. Paleta de Cores

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| primary | #6366f1 (Indigo) | #818cf8 | Ações principais, destaques |
| background | #ffffff | #0f172a | Fundo das telas |
| surface | #f8fafc | #1e293b | Cards, superfícies elevadas |
| foreground | #0f172a | #f8fafc | Texto principal |
| muted | #64748b | #94a3b8 | Texto secundário |
| border | #e2e8f0 | #334155 | Bordas e divisores |
| success | #22c55e | #4ade80 | Sucesso, presença |
| warning | #f59e0b | #fbbf24 | Alertas |
| error | #ef4444 | #f87171 | Erros, ausência |

## 3. Lista de Telas

### 3.1 Autenticação
- **Login**: Email e senha, botão de cadastro
- **Cadastro**: Nome, email, senha
- **Recuperar Senha**: Email para reset

### 3.2 Tabs Principais (Líder/Participante)
- **Home (Dashboard)**: Estatísticas, próximos eventos, aniversariantes
- **Membros**: Lista de membros da célula, busca, filtros
- **Presenças**: Registro de presenças por data
- **Perfil**: Dados do usuário, configurações, logout

### 3.3 Telas Secundárias
- **Detalhe do Membro**: Informações completas, histórico
- **Novo Membro**: Formulário de cadastro
- **Eventos**: Lista e criação de eventos
- **Detalhe do Evento**: Informações e inscritos

### 3.4 Telas Específicas por Perfil

#### Pastor
- **Dashboard Pastor**: Visão de todos discipuladores
- **Lista de Discipuladores**: Cards com estatísticas
- **Detalhe Discipulador**: Células supervisionadas

#### Discipulador
- **Dashboard Discipulador**: Visão das células supervisionadas
- **Lista de Células**: Cards com estatísticas
- **Detalhe da Célula**: Membros, eventos, métricas

## 4. Fluxos Principais

### 4.1 Login → Dashboard
1. Usuário abre o app
2. Tela de login (se não autenticado)
3. Insere email e senha
4. Sistema verifica credenciais no Supabase
5. Detecta papel do usuário (Pastor/Discipulador/Líder/Participante)
6. Redireciona para dashboard apropriado

### 4.2 Registrar Presença
1. Líder acessa aba "Presenças"
2. Seleciona data (padrão: hoje)
3. Lista de membros aparece com checkboxes
4. Marca presentes/ausentes
5. Salva automaticamente no Supabase

### 4.3 Adicionar Membro
1. Líder acessa aba "Membros"
2. Toca no botão "+"
3. Preenche formulário (nome, telefone, função)
4. Salva no Supabase
5. Membro aparece na lista

## 5. Componentes Reutilizáveis

- **MemberCard**: Card de membro com avatar, nome, função
- **StatCard**: Card de estatística com ícone, valor, label
- **EventCard**: Card de evento com data, título, local
- **AttendanceRow**: Linha de presença com toggle
- **EmptyState**: Estado vazio com ilustração e ação

## 6. Navegação

```
App
├── (auth)
│   ├── login
│   └── signup
├── (tabs) [Líder/Participante]
│   ├── index (Dashboard)
│   ├── members
│   ├── attendance
│   └── profile
├── (pastor-tabs) [Pastor]
│   ├── index (Dashboard)
│   ├── discipuladores
│   └── profile
└── (discipulador-tabs) [Discipulador]
    ├── index (Dashboard)
    ├── celulas
    └── profile
```

## 7. Integrações

- **Supabase Auth**: Autenticação de usuários
- **Supabase Database**: Dados de membros, presenças, eventos
- **Supabase Storage**: Fotos de perfil (futuro)

## 8. Considerações Mobile

- **Orientação**: Portrait apenas
- **Gestos**: Pull-to-refresh nas listas
- **Feedback**: Haptics em ações importantes
- **Offline**: Cache local com AsyncStorage (futuro)
