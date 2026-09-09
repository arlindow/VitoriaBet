const { PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const INITIAL_GAMES = [
    {
        gameCode: 'gates-of-olympus',
        title: 'Gates of Olympus',
        provider: 'PRAGMATIC',
        category: 'SLOTS',
        bannerUrl: 'https://th.bing.com/th/id/OIP.cLHtCLXfPAetYleMMBcjbAHaEK?w=301&h=180&c=7&r=0&o=7&pid=1.7&rm=3'
    },
    {
        gameCode: 'sweet-bonanza',
        title: 'Sweet Bonanza',
        provider: 'PRAGMATIC',
        category: 'SLOTS',
        bannerUrl: 'https://www.bing.com/images/search?view=detailV2&ccid=kpJO1AA%2b&id=C50881A8A87FC984291F37EADFD9E0AC4C9674D5&thid=OIP.kpJO1AA-vvVTONCqN3yRgQHaEF&mediaurl=https%3a%2f%2fsweetbonanza.run%2ftheme%2fimg%2fgallery%2f8.webp&cdnurl=https%3a%2f%2fth.bing.com%2fth%2fid%2fR.92924ed4003ebef55338d0aa377c9181%3frik%3d1XSWTKzg2d%252fqNw%26pid%3dImgRaw%26r%3d0&exph=565&expw=1024&q=sweet-bonanza&FORM=IRPRST&ck=65F4FBA35548FC3637ECCEE30692F3BD&selectedIndex=3&itb=0'
    },
    {
        gameCode: 'fortune-tiger',
        title: 'Fortune Tiger',
        provider: 'PGSOFT',
        category: 'SLOTS',
        bannerUrl: 'https://www.bing.com/images/search?view=detailV2&ccid=KW9uvpgB&id=B35F9818642D11017FFA5D6E4D411E92D207E419&thid=OIP.KW9uvpgB67T_EoonJMbhCAHaHa&mediaurl=https%3a%2f%2fwww.fortune-tiger-jogar.com%2fwp-content%2fuploads%2f2024%2f04%2fV1JRyHrReJaYJK-1024x1024.jpg.webp&cdnurl=https%3a%2f%2fth.bing.com%2fth%2fid%2fR.296f6ebe9801ebb4ff128a2724c6e108%3frik%3dGeQH0pIeQU1uXQ%26pid%3dImgRaw%26r%3d0&exph=1024&expw=1024&q=fortune+tiger&FORM=IRPRST&ck=C6587B7FC1C4D08AFD7B8C3390284208&selectedIndex=7&itb=0'
    },
    {
        gameCode: 'fortune-ox',
        title: 'Fortune Ox',
        provider: 'PGSOFT',
        category: 'SLOTS',
        bannerUrl: 'https://www.bing.com/images/search?view=detailV2&ccid=oIwngmxV&id=B49A88586CE8B42A8301E78D214C6987549247F9&thid=OIP.oIwngmxV-qdHwAN0jYMF9wHaEw&mediaurl=https%3a%2f%2fth.bing.com%2fth%2fid%2fR.a08c27826c55faa747c003748d8305f7%3frik%3d%252bUeSVIdpTCGN5w%26riu%3dhttp%253a%252f%252fres.cloudinary.com%252faposta10%252fimage%252fupload%252fv1695642771%252ffortune-ox-thumb-s2fd5j.webp%26ehk%3do2vA9y0AM7QaRJO%252bpBBLvGtSk6gZSDF88VQ8HBFKIOg%253d%26risl%3d%26pid%3dImgRaw%26r%3d0&exph=900&expw=1400&q=fortune+ox&FORM=IRPRST&ck=7DCD3D1BFC440D7A5C6D2512CBE46263&selectedIndex=14&itb=0'
    }
];

async function main() {
    console.log('Populando banco da VitoriaBet...');

    // Cria usuario de teste com saldo inicial
    const demoUser = await prisma.user.upsert({
        where: {username: 'jogador1'},
        update: {},
        create: {
            username: 'jogador1',
            email: 'jogador1@vitoriabet.com',
            passwordHash: 'hash_temporario_demo',
            balance: 500.00
        }
    });
    
    //Insere catálogo de jogos
    for (const game of INITIAL_GAMES) { 
        await prisma.game.upsert({
            where: { gameCode: game.gameCode },
            update: {},
            create: game
        });
    }

    console.log(`✅ Sucesso! Usuário demo criado (ID: ${demoUser.id}) e ${INITIAL_GAMES.length} jogos cadastrados.`);

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

    