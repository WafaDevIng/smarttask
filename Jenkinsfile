pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        DOCKER_REGISTRY = 'registry.hub.docker.com'
        IMAGE_BACKEND  = "foufamabrouki63/smarttask-backend"
        IMAGE_FRONTEND = "foufamabrouki63/dsmarttask-frontend"
        SONARQUBE_SERVER = 'SonarQube'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        // ─── 1. Checkout ───────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        // ─── 2. Install dependencies ───────────────────────────────
        stage('Install') {
            parallel {
                stage('Backend install') {
                    steps {
                        dir('backend') {
                            nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                                sh 'npm ci'
                            }
                        }
                    }
                }
                stage('Frontend install') {
                    steps {
                        dir('frontend') {
                            nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                                sh 'npm ci'
                            }
                        }
                    }
                }
            }
        }

        // ─── 3. Lint ───────────────────────────────────────────────
        stage('Lint') {
            parallel {
                stage('Backend lint') {
                    steps {
                        dir('backend') {
                            sh 'npm run lint --if-present'
                        }
                    }
                }
                stage('Frontend lint') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint'
                        }
                    }
                }
            }
        }

        // ─── 4. Test ───────────────────────────────────────────────
        stage('Test') {
            parallel {
                stage('Backend tests') {
                    steps {
                        dir('backend') {
                            sh 'npm test -- --forceExit --coverage'
                        }
                    }
                    post {
                        always {
                            publishHTML(target: [
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'backend/coverage/lcov-report',
                                reportFiles: 'index.html',
                                reportName: 'Backend Coverage'
                            ])
                        }
                    }
                }
                stage('Frontend tests') {
                    steps {
                        dir('frontend') {
                            sh 'npm test -- --watch=false --code-coverage'
                        }
                    }
                    post {
                        always {
                            publishHTML(target: [
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'frontend/coverage',
                                reportFiles: 'index.html',
                                reportName: 'Frontend Coverage'
                            ])
                        }
                    }
                }
            }
        }

        // ─── 5. SonarQube Analysis ─────────────────────────────────
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv(SONARQUBE_SERVER) {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=smarttask \
                          -Dsonar.projectName=SmartTask \
                          -Dsonar.sources=backend/src,frontend/src \
                          -Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info
                    '''
                }
            }
        }

        // ─── 6. Quality Gate ───────────────────────────────────────
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ─── 7. Build Docker images ────────────────────────────────
        stage('Build Docker Images') {
            when { branch pattern: "main|develop|release/.*", comparator: "REGEXP" }
            parallel {
                stage('Build Backend') {
                    steps {
                        sh "docker build -t ${IMAGE_BACKEND}:${IMAGE_TAG} -t ${IMAGE_BACKEND}:latest ./backend"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh "docker build -t ${IMAGE_FRONTEND}:${IMAGE_TAG} -t ${IMAGE_FRONTEND}:latest ./frontend"
                    }
                }
            }
        }

        // ─── 8. Push to Registry ──────────────────────────────────
        stage('Push Images') {
            when { branch 'main' }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push ${IMAGE_BACKEND}:latest
                        docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push ${IMAGE_FRONTEND}:latest
                    '''
                }
            }
        }

        // ─── 9. Deploy to Staging ─────────────────────────────────
        stage('Deploy Staging') {
            when { branch 'develop' }
            steps {
                echo 'Deploying to staging...'
                sh '''
                    docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
                    docker system prune -f
                '''
            }
        }

        // ─── 10. Deploy to Production (with approval) ──────────────
        stage('Deploy Production') {
            when { branch 'main' }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                echo 'Deploying to production...'
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'prod-server-ssh',
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh '''
                        ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SSH_USER@$PROD_HOST \
                          "cd /opt/smarttask && \
                           docker-compose pull && \
                           docker-compose up -d --no-build && \
                           docker system prune -f"
                    '''
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
            // Add Slack/email notification here
        }
        failure {
            echo 'Pipeline failed!'
            // Add Slack/email notification here
        }
    }
}
