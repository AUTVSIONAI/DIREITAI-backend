const express = require('express');
const http = require('http');
const gamificationRoutes = require('./routes/gamification');

async function testQuizAPI() {
  try {
    console.log('🧪 Testando API do quiz...');
    
    // Criar servidor Express temporário
    const app = express();
    app.use(express.json());
    app.use('/api/gamification', gamificationRoutes);
    
    const server = http.createServer(app);
    
    // Iniciar servidor na porta 5120
    server.listen(5120, async () => {
      console.log('✅ Servidor de teste iniciado na porta 5120');
      
      const testUserId = 'bcd0593a-ba47-4262-8f8f-cb32f97e58d6'; // ID do usuário na tabela users
      const quizData = {
        quizType: 'constitution',
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        timeSpent: 120,
        answers: [
          { question: 1, answer: 'A', correct: true },
          { question: 2, answer: 'B', correct: true },
          { question: 3, answer: 'C', correct: false },
          { question: 4, answer: 'A', correct: true },
          { question: 5, answer: 'B', correct: true },
          { question: 6, answer: 'C', correct: true },
          { question: 7, answer: 'A', correct: false },
          { question: 8, answer: 'B', correct: true },
          { question: 9, answer: 'C', correct: true },
          { question: 10, answer: 'A', correct: true }
        ]
      };
      
      // Token válido do Supabase obtido via login
       const testToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InpjcnU3QTZFY0ZRdzM0ZnIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3Z1c3Nnc2xlbnZ5enRja2V1eWFwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIwMTU1Y2NiNy1lNjdmLTQxZGMtYTEzMy0xODhmOTc5OTZiNzMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1NDk1Mjc0LCJpYXQiOjE3NTU0OTE2NzQsImVtYWlsIjoibWF1bWF1dHJlbWV0ZXJyYUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWF1bWF1dHJlbWV0ZXJyYUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwbGFuIjoiZ3JhdHVpdG8iLCJyb2xlIjoidXNlciIsInN1YiI6IjAxNTVjY2I3LWU2N2YtNDFkYy1hMTMzLTE4OGY5Nzk5NmI3MyIsInVzZXJuYW1lIjoib3NlaWFzIGdvbWVzIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTU0OTE2NzR9XSwic2Vzc2lvbl9pZCI6ImE2YjJmYTE1LTI1YWItNDgwZC04YmI1LWRkZjc5NWMxMjhhMSIsImlzX2Fub255bW91cyI6ZmFsc2V9.IzRpN3cHUbbazSW_K_yJlUc8eLiwAwgJAaW9nYSche4';
      
      console.log('📝 Enviando dados do quiz via API...');
      
      const postData = JSON.stringify(quizData);
      const options = {
        hostname: 'localhost',
        port: 5120,
        path: `/api/gamification/users/${testUserId}/quiz-result`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('✅ Resposta da API:');
            console.log('  - Quiz ID:', response.quizResult?.id);
            console.log('  - Pontos ganhos:', response.pointsEarned);
            console.log('  - Novas conquistas:', response.newAchievements?.length || 0);
            console.log('  - Subiu de nível:', response.levelUp);
            
            if (response.newAchievements && response.newAchievements.length > 0) {
              console.log('🏆 Conquistas desbloqueadas:');
              response.newAchievements.forEach(achievement => {
                console.log(`  - ${achievement.name}: ${achievement.description}`);
              });
            }
            
            console.log('\n✅ Teste da API concluído com sucesso!');
          } catch (parseError) {
            console.log('❌ Erro ao parsear resposta:', parseError.message);
            console.log('Resposta bruta:', data);
          }
          
          server.close();
        });
      });
      
      req.on('error', (e) => {
        console.error('❌ Erro na requisição:', e.message);
        server.close();
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error('❌ Erro geral no teste da API:', error.message);
  }
}

testQuizAPI();