// scripts/generate-report.js
const fs = require('fs');
const path = require('path');

let docx;
try {
    docx = require('docx');
} catch (err) {
    console.error("Erreur : La bibliothèque 'docx' n'est pas installée.");
    console.error("Veuillez l'installer en exécutant la commande suivante dans votre terminal :");
    console.error("  npm install docx\n");
    process.exit(1);
}

const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    HeadingLevel,
    WidthType,
    AlignmentType,
    BorderStyle,
    PageBreak,
    UnderlineType
} = docx;

// Couleurs du design system
const COLOR_PRIMARY = "1F4E79";   // Bleu Foncé
const COLOR_SECONDARY = "2E75B6"; // Bleu Moyen
const COLOR_TEXT = "333333";      // Noir doux
const COLOR_MUTED = "7F7F7F";     // Gris
const COLOR_BG_LIGHT = "F2F4F7";  // Gris très clair pour les tableaux et encadrés
const COLOR_BORDER = "D3D3D3";    // Gris clair pour les bordures

// Fonctions utilitaires pour la mise en page
function heading1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 120 },
        keepWithNext: true,
        children: [
            new TextRun({
                text: text,
                bold: true,
                size: 28, // 14pt
                color: COLOR_PRIMARY,
                font: "Calibri"
            })
        ]
    });
}

function heading2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        keepWithNext: true,
        children: [
            new TextRun({
                text: text,
                bold: true,
                size: 24, // 12pt
                color: COLOR_SECONDARY,
                font: "Calibri"
            })
        ]
    });
}

function heading3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 80 },
        keepWithNext: true,
        children: [
            new TextRun({
                text: text,
                bold: true,
                size: 22, // 11pt
                color: COLOR_TEXT,
                font: "Calibri"
            })
        ]
    });
}

function bodyText(text, options = {}) {
    return new Paragraph({
        spacing: { before: 80, after: 80 },
        alignment: options.align || AlignmentType.LEFT,
        children: [
            new TextRun({
                text: text,
                size: 22, // 11pt
                color: options.color || COLOR_TEXT,
                italic: options.italic || false,
                bold: options.bold || false,
                font: "Calibri"
            })
        ]
    });
}

function bulletPoint(text, boldPrefix = "") {
    const children = [];
    if (boldPrefix) {
        children.push(new TextRun({
            text: boldPrefix,
            bold: true,
            size: 22,
            color: COLOR_TEXT,
            font: "Calibri"
        }));
    }
    children.push(new TextRun({
        text: text,
        size: 22,
        color: COLOR_TEXT,
        font: "Calibri"
    }));
    return new Paragraph({
        bullet: {
            level: 0
        },
        spacing: { before: 60, after: 60 },
        children: children
    });
}

function codeBlock(codeText) {
    const lines = codeText.split('\n');
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            left: { style: BorderStyle.SINGLE, size: 12, color: COLOR_PRIMARY }, // Bordure gauche plus épaisse
            right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { fill: COLOR_BG_LIGHT },
                        margins: { top: 120, bottom: 120, left: 160, right: 160 },
                        children: lines.map(line => new Paragraph({
                            spacing: { before: 20, after: 20 },
                            children: [
                                new TextRun({
                                    text: line,
                                    size: 18, // 9pt
                                    font: "Consolas",
                                    color: "2B2B2B"
                                })
                            ]
                        }))
                    })
                ]
            })
        ]
    });
}

function createTable(headers, rowsData, widths = []) {
    // Calcul automatique des largeurs si non fournies
    const colCount = headers.length;
    const defaultWidth = 100 / colCount;

    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
            shading: { fill: COLOR_PRIMARY },
            width: { size: widths[i] || defaultWidth, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                        new TextRun({
                            text: h,
                            bold: true,
                            color: "FFFFFF",
                            size: 20,
                            font: "Calibri"
                        })
                    ]
                })
            ]
        }))
    });

    const rows = [headerRow];

    rowsData.forEach((rowData, rowIndex) => {
        const isEven = rowIndex % 2 === 1;
        const row = new TableRow({
            children: rowData.map((cellText, cellIndex) => new TableCell({
                shading: { fill: isEven ? COLOR_BG_LIGHT : "FFFFFF" },
                width: { size: widths[cellIndex] || defaultWidth, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER },
                    left: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER },
                    right: { style: BorderStyle.SINGLE, size: 2, color: COLOR_BORDER }
                },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: String(cellText),
                                size: 20,
                                color: COLOR_TEXT,
                                font: "Calibri"
                            })
                        ]
                    })
                ]
            }))
        });
        rows.push(row);
    });

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows,
        spacing: { before: 200, after: 200 }
    });
}

// Lecture des fichiers de conception s'ils existent
function readConceptionFile(filename) {
    try {
        const filePath = path.join(__dirname, '..', 'conception', filename);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (e) {
        console.warn(`Attention : Impossible de lire ${filename}`);
    }
    return '';
}

const umlUseCases = readConceptionFile('CaseUse.plantuml');
const umlClasses = readConceptionFile('ClasseDiagram.plantuml');
const umlSequence = readConceptionFile('DiagrammeSequence.plantuml');
const umlActivity = readConceptionFile('Diagramme Activite.plantuml');

// -- Construction du Document --
const doc = new Document({
    title: "Rapport de Projet SmartTask",
    description: "Documentation technique et d'architecture de SmartTask",
    sections: [
        // ──────────────── PAGE DE GARDE ────────────────
        {
            properties: {
                page: {
                    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } // 1 inch
                }
            },
            children: [
                new Paragraph({ spacing: { before: 1500 } }), // Espacement haut
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "⚡ SmartTask",
                            bold: true,
                            size: 72, // 36pt
                            color: COLOR_PRIMARY,
                            font: "Outfit"
                        })
                    ]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 400 },
                    children: [
                        new TextRun({
                            text: "Plateforme DevOps Collaborative avec Assistant IA Intégré",
                            italic: true,
                            size: 28, // 14pt
                            color: COLOR_MUTED,
                            font: "Calibri"
                        })
                    ]
                }),
                // Ligne de séparation
                new Table({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY }, // Ligne épaisse
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                    },
                    rows: [new TableRow({ children: [new TableCell({ children: [] })] })]
                }),
                new Paragraph({ spacing: { before: 1800 } }), // Grand espacement avant les métadonnées
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "RAPPORT DE PROJET TECHNIQUE ET D'ARCHITECTURE",
                            bold: true,
                            size: 24, // 12pt
                            color: COLOR_PRIMARY,
                            font: "Calibri"
                        })
                    ]
                }),
                new Paragraph({ spacing: { before: 1000 } }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "Technologies Clés : ",
                            bold: true,
                            size: 20,
                            color: COLOR_TEXT,
                            font: "Calibri"
                        }),
                        new TextRun({
                            text: "Angular 17 · Node.js 20 · MongoDB · Docker · Kubernetes · Jenkins · Prometheus · Grafana",
                            size: 20,
                            color: COLOR_TEXT,
                            font: "Calibri"
                        })
                    ]
                }),
                new Paragraph({ spacing: { before: 1500 } }),
                // Métadonnées bas de page
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "Date : ",
                            bold: true,
                            size: 20,
                            color: COLOR_MUTED,
                            font: "Calibri"
                        }),
                        new TextRun({
                            text: new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
                            size: 20,
                            color: COLOR_MUTED,
                            font: "Calibri"
                        })
                    ]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "Version du document : ",
                            bold: true,
                            size: 20,
                            color: COLOR_MUTED,
                            font: "Calibri"
                        }),
                        new TextRun({
                            text: "1.0.0 (Officielle)",
                            size: 20,
                            color: COLOR_MUTED,
                            font: "Calibri"
                        })
                    ]
                }),
                new Paragraph({ children: [new PageBreak()] })
            ]
        },
        // ──────────────── CORPS DU DOCUMENT ────────────────
        {
            properties: {
                page: {
                    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
                }
            },
            children: [
                // 1. INTRODUCTION
                heading1("1. Introduction"),
                bodyText("SmartTask est une plateforme web moderne et collaborative dédiée à la gestion de tâches et de projets au sein d'équipes de développement. Conçue avec des normes DevOps et logicielles rigoureuses, elle propose un environnement robuste combinant une interface utilisateur réactive (Angular 17), une API modulaire (Node.js/Express) et un moteur intelligent d'assistance contextuelle (SmartBot avec GPT-4o-mini)."),
                bodyText("Ce rapport présente la conception globale du système, son modèle de données détaillé, les interfaces de programmation applicative (API), ainsi que la chaîne complète d'intégration, de déploiement et de surveillance continue."),
                
                heading2("Stack Technologique Globale"),
                bulletPoint(" Angular 17 (Standalone architecture, RxJS, TailwindCSS / Custom CSS).", "Frontend :"),
                bulletPoint(" Node.js 20, Express, JWT, Mongoose, Winston (Logger), Swagger API.", "Backend :"),
                bulletPoint(" MongoDB (Modèle orienté documents, indexé pour les performances).", "Base de données :"),
                bulletPoint(" Jenkins (Pipeline multi-étapes automatisé, analyses qualité SonarQube).", "CI/CD :"),
                bulletPoint(" Docker et Docker Compose (Conteneurisation complète en dev/prod).", "Conteneurisation :"),
                bulletPoint(" Kubernetes (Déploiements, ReplicaSets, HPA pour l'auto-scaling, Ingress).", "Orchestration :"),
                bulletPoint(" Prometheus (Collecte de métriques), Grafana (Supervision), Loki (Logs).", "Supervision :"),

                new Paragraph({ spacing: { after: 120 } }),

                // 2. CONCEPTION ET MODELISATION UML
                heading1("2. Conception et Modélisation UML"),
                bodyText("L'ingénierie système de SmartTask a été conçue à l'aide de plusieurs diagrammes UML qui modélisent le comportement dynamique et la structure statique du logiciel."),

                heading2("2.1. Diagramme de Cas d'Utilisation"),
                bodyText("Le diagramme ci-dessous présente les rôles des utilisateurs (Membres de projet et Administrateurs) et leurs interactions avec le système, incluant le SmartBot comme entité automatisée."),
                umlUseCases ? codeBlock(umlUseCases) : bodyText("[Le fichier CaseUse.plantuml n'a pas pu être chargé.]"),
                bodyText("Dans ce modèle, l'Administrateur hérite de toutes les fonctionnalités du Membre Standard et possède des droits d'administration supplémentaires (gestion des comptes, archivage de projets). Le SmartBot intervient de façon asynchrone pour générer des résumés de tâches basés sur les questions de l'utilisateur."),

                heading2("2.2. Diagramme de Classes (Modèle Logique)"),
                bodyText("Le modèle de données s'appuie sur une structure NoSQL claire modélisant les relations entre les utilisateurs, les projets, les tâches, les commentaires et les notifications."),
                umlClasses ? codeBlock(umlClasses) : bodyText("[Le fichier ClasseDiagram.plantuml n'a pas pu être chargé.]"),

                heading2("2.3. Diagramme de Séquence Global"),
                bodyText("Ce diagramme illustre le flux complet depuis l'authentification de l'utilisateur, la création d'un projet, l'assignation d'une tâche avec notification en temps réel, jusqu'à l'interrogation du SmartBot."),
                umlSequence ? codeBlock(umlSequence) : bodyText("[Le fichier DiagrammeSequence.plantuml n'a pas pu être chargé.]"),

                heading2("2.4. Diagramme d'Activité"),
                bodyText("Ce diagramme décrit la navigation et le workflow opérationnel, notamment le cycle de vie d'une tâche (À Faire -> En Cours -> En Revue -> Terminé) et son circuit de validation par les pairs."),
                umlActivity ? codeBlock(umlActivity) : bodyText("[Le fichier Diagramme Activite.plantuml n'a pas pu être chargé.]"),

                new Paragraph({ children: [new PageBreak()] }),

                // 3. STRUCTURE ET INFRASTRUCTURE DE CODE
                heading1("3. Architecture Technique et Structure"),
                bodyText("Le projet SmartTask est organisé de manière monolithique modulaire (Monorepo), permettant de centraliser les composants de l'application et les configurations d'infrastructure."),
                
                heading2("3.1. Structure du Code Source"),
                codeBlock(`smarttask/
├── backend/                  # API Node.js + Express
│   ├── src/                  # Code source (routes, modèles, contrôleurs)
│   └── tests/                # Tests unitaires et d'intégration Jest
├── frontend/                 # Application SPA Angular 17
│   ├── src/app/              # Composants standalone et services
│   └── nginx.conf            # Serveur web de production
├── k8s/                      # Manifestes d'orchestration Kubernetes
├── monitoring/               # Fichiers de configuration Prometheus/Loki
├── docker-compose.yml        # Stack principale locale
└── Jenkinsfile               # Pipeline CI/CD`),

                heading2("3.2. Architecture du Backend"),
                bodyText("Le serveur backend est écrit en JavaScript moderne. Il utilise le framework Express pour exposer des services RESTful et Mongoose pour communiquer avec la base MongoDB. La structure interne du backend suit les meilleures pratiques MVC (Modèle-Vue-Contrôleur) :"),
                bulletPoint(" Gère la connexion et l'initialisation de la base de données MongoDB, la configuration globale (variables d'environnement) et le middleware de sécurité.", "Configuration (config/) :"),
                bulletPoint(" Définit les schémas et modèles de données persistants (User, Project, Task, Comment, Notification).", "Modèles (models/) :"),
                bulletPoint(" Contient la logique métier (création de projet, assignation de tâches, calcul de statistiques, génération de messages IA).", "Contrôleurs (controllers/) :"),
                bulletPoint(" Implémente la sécurité par JWT (JSON Web Tokens) pour sécuriser l'accès aux endpoints de l'API.", "Middlewares (middleware/) :"),
                bulletPoint(" Déclare les points d'accès HTTP et les associe aux contrôleurs.", "Routes (routes/) :"),

                new Paragraph({ spacing: { after: 120 } }),

                // 4. MODELE DE DONNEES ET PERSISTANCE
                heading1("4. Modèle de Données (MongoDB)"),
                bodyText("Bien que MongoDB soit une base de données NoSQL sans schéma rigide par défaut, Mongoose permet de définir des schémas structurés au niveau applicatif pour sécuriser et valider les écritures. Voici les spécifications des collections principales :"),
                
                heading2("4.1. Collection 'users' (Utilisateurs)"),
                bulletPoint(" Clé primaire.", "_id (ObjectId) :"),
                bulletPoint(" Nom de l'utilisateur.", "name (String) :"),
                bulletPoint(" Email unique servant d'identifiant de connexion.", "email (String) :"),
                bulletPoint(" Mot de passe haché (via bcrypt).", "password (String) :"),
                bulletPoint(" Rôle d'accès (valeurs : 'user', 'admin').", "role (String) :"),
                bulletPoint(" Lien ou chemin vers l'image de profil.", "avatar (String) :"),

                heading2("4.2. Collection 'projects' (Projets)"),
                bulletPoint(" Nom du projet.", "name (String) :"),
                bulletPoint(" Description textuelle du projet.", "description (String) :"),
                bulletPoint(" Référence vers l'utilisateur propriétaire.", "owner (ObjectId, ref: 'User') :"),
                bulletPoint(" Liste de références vers les membres du projet.", "members (ObjectId[], ref: 'User') :"),
                bulletPoint(" Statut ('active', 'archived').", "status (String) :"),
                bulletPoint(" Date limite de complétion.", "deadline (Date) :"),

                heading2("4.3. Collection 'tasks' (Tâches)"),
                bulletPoint(" Titre de la tâche.", "title (String) :"),
                bulletPoint(" Descriptif.", "description (String) :"),
                bulletPoint(" Statut ('to_do', 'in_progress', 'under_review', 'completed').", "status (String) :"),
                bulletPoint(" Priorité ('low', 'medium', 'high', 'urgent').", "priority (String) :"),
                bulletPoint(" Lien vers le projet parent.", "project (ObjectId, ref: 'Project') :"),
                bulletPoint(" Utilisateur assigné.", "assignee (ObjectId, ref: 'User') :"),
                bulletPoint(" Date d'échéance de la tâche.", "dueDate (Date) :"),

                new Paragraph({ children: [new PageBreak()] }),

                // 5. API ENDPOINTS
                heading1("5. Spécifications de l'API REST"),
                bodyText("L'API de SmartTask est documentée via un outil de spécification en ligne Swagger disponible sur '/api-docs'. Le tableau ci-dessous synthétise les points d'accès principaux :"),

                createTable(
                    ["Méthode", "Route API", "Description", "Auth. Requise"],
                    [
                        ["POST", "/api/auth/register", "Inscription de nouveaux utilisateurs", "Non"],
                        ["POST", "/api/auth/login", "Connexion & Génération du Token JWT", "Non"],
                        ["GET", "/api/auth/me", "Récupération du profil courant", "Oui (JWT)"],
                        ["GET", "/api/projects", "Liste des projets de l'utilisateur", "Oui (JWT)"],
                        ["POST", "/api/projects", "Création d'un nouveau projet", "Oui (JWT)"],
                        ["GET", "/api/tasks", "Lister et filtrer les tâches", "Oui (JWT)"],
                        ["POST", "/api/tasks", "Créer une nouvelle tâche", "Oui (JWT)"],
                        ["PATCH", "/api/tasks/:id/status", "Modifier le statut d'une tâche", "Oui (JWT)"],
                        ["GET", "/api/tasks/stats", "Obtenir les statistiques d'avancement", "Oui (JWT)"],
                        ["POST", "/api/chat/message", "Discuter avec l'assistant SmartBot IA", "Oui (JWT)"]
                    ],
                    [15, 30, 40, 15]
                ),

                new Paragraph({ spacing: { after: 120 } }),

                // 6. PIPELINE CI/CD JENKINS
                heading1("6. Pipeline d'Intégration & Déploiement Continus (CI/CD)"),
                bodyText("Le projet implémente un pipeline déclaratif moderne et robuste sous Jenkins, défini dans le fichier Jenkinsfile. Ce pipeline orchestre la validation de la qualité et la mise en production continue :"),

                bulletPoint(" Clone du code source Git, récupération de la version et création automatique du tag d'image Docker à partir du SHA du commit.", "1. Checkout :"),
                bulletPoint(" Installation conjointe et parallélisée des dépendances backend et frontend via npm pour optimiser le temps d'exécution.", "2. Installation :"),
                bulletPoint(" Analyse syntaxique et stylistique des codes Angular et Node.js pour assurer le respect des standards.", "3. Lint :"),
                bulletPoint(" Exécution en parallèle des suites de tests unitaires et d'intégration (Jest pour le backend, Karma/Jasmine pour le frontend) et génération des fichiers de couverture.", "4. Tests :"),
                bulletPoint(" Analyse statistique de la qualité du code (bugs potentiels, dette technique, duplication) via SonarScanner.", "5. SonarQube :"),
                bulletPoint(" Blocage automatique du déploiement si le score de qualité minimal requis n'est pas atteint (Quality Gate).", "6. Quality Gate :"),
                bulletPoint(" Construction automatisée des images Docker multi-stages optimisées pour la production.", "7. Build Docker :"),
                bulletPoint(" Authentification et publication des images packagées sur le registre central DockerHub.", "8. Push Registry :"),
                bulletPoint(" Déploiement sans interruption de service sur l'infrastructure de staging (liaison automatique avec la branche develop).", "9. Déploiement Staging :"),
                bulletPoint(" Déploiement sécurisé en production via une validation manuelle requise de l'administrateur système (liaison avec la branche main).", "10. Déploiement Prod :"),

                new Paragraph({ spacing: { after: 120 } }),

                // 7. DEPLOYEMENT ET MONITORING
                heading1("7. Orchestration, Conteneurisation et Supervision"),
                bodyText("L'infrastructure de SmartTask repose sur des technologies d'orchestration modernes assurant scalabilité, haute disponibilité et résilience face aux pannes."),

                heading2("7.1. Orchestration avec Kubernetes"),
                bodyText("En production, l'application est déployée sur un cluster Kubernetes. Les manifestes YAML configurés dans le dossier 'k8s/' définissent :"),
                bulletPoint(" Deux pods actifs pour le backend et deux pods pour le frontend afin de garantir la haute disponibilité.", "Haute Disponibilité (Replicas) :"),
                bulletPoint(" Les ConfigMaps gèrent la configuration globale de l'API, tandis que les Secrets chiffrés protègent les clés privées (JWT_SECRET, MONGODB_URI, etc.).", "Sécurité des configurations :"),
                bulletPoint(" Les probes 'livenessProbe' et 'readinessProbe' effectuent des vérifications régulières sur l'endpoint '/health' pour redémarrer automatiquement les conteneurs défaillants.", "Healthchecks :"),
                bulletPoint(" Un HPA (Horizontal Pod Autoscaler) ajuste dynamiquement le nombre de pods (de 2 à 10) selon la charge CPU constatée (seuil d'alerte à 70%).", "Auto-scaling :"),
                bulletPoint(" Un contrôleur Nginx Ingress avec redirection de flux SSL certifié par Let's Encrypt.", "Routage (Ingress) :"),

                heading2("7.2. Supervision Continue (Monitoring)"),
                bodyText("Pour suivre l'état du système en temps réel, une stack de monitoring complète est déployée via 'docker-compose.monitoring.yml' :"),
                bulletPoint(" Collecte les métriques de performance système et applicatives toutes les 15 secondes.", "Prometheus :"),
                bulletPoint(" Visualise les métriques sous forme de tableaux de bord riches (utilisation CPU/RAM, temps de réponse des routes API).", "Grafana :"),
                bulletPoint(" Agrège les flux de logs des conteneurs pour simplifier le débogage centralisé.", "Loki :"),

                new Paragraph({ spacing: { after: 120 } }),

                // 8. CHATBOT IA (SMARTBOT)
                heading1("8. Assistant Intelligent SmartBot"),
                bodyText("L'une des innovations majeures de SmartTask est l'intégration d'un assistant conversationnel contextuel disponible directement dans l'interface de travail :"),
                bulletPoint(" Le chatbot interroge la base de données MongoDB pour récupérer les tâches en retard, urgentes ou affectées à l'utilisateur.", "Accès Contextuel :"),
                bulletPoint(" Les données d'activité sont nettoyées et injectées dynamiquement dans le prompt système envoyé à l'API OpenAI (modèle GPT-4o-mini).", "Prompt Engineering :"),
                bulletPoint(" Si aucune clé d'API valide n'est configurée, un algorithme local basé sur des expressions régulières prend le relais de manière transparente pour répondre aux requêtes de base.", "Mécanisme de Repli (Fallback) :"),

                new Paragraph({ spacing: { before: 400 } }),
                bodyText("--- FIN DU RAPPORT DE PROJET ---", { align: AlignmentType.CENTER, italic: true, color: COLOR_MUTED })
            ]
        }
    ]
});

// Écriture du fichier DOCX généré
const outPath = path.join(__dirname, '..', 'SmartTask_Rapport_Projet.docx');
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(outPath, buffer);
    console.log(`\n======================================================`);
    console.log(`🎉 Rapport généré avec succès !`);
    console.log(`Chemin : ${outPath}`);
    console.log(`======================================================\n`);
}).catch((err) => {
    console.error("Erreur lors de la génération du document :", err);
});
