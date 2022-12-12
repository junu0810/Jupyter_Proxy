const express = require('express');
const cookieParser = require('cookie-parser');
const { connection , postAxios , Query ,jupyterInfo} = require('./util')

const app = express();

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/' , async (req,res) => {
    
    let course;
    req.query.class ? course = req.query.class : course = '' //User JupyterNoteBook의 폴더이름 
    
    const redirectURL = jupyterInfo.redirectURL // redirect시 JupyterHub의 URL 
    const headerToken =  jupyterInfo.headerToken // JupyterHub의 admin's Token
    const MoodleCookie = req.cookies.MoodleSession // Cookie에 저장된 Moodle 사용자 인증 Session

    let DBresult; // Query후 결과값을 저장하는곳 
    let userInfo; // 유저 정보 저장(sid, userid, jupyter, username, email)


    //DB 조회로 사용자 정보 획득
    DBresult = await connection.query(Query( 'userSelect' ,MoodleCookie))
    userInfo = DBresult[0][0] 
    
    console.log(userInfo)
    // user가 admin일 경우 바로 로그인 페이지로 redirect 
    if(!userInfo){
        return res.status(200).send({"message":"등록완료"})
    }
    else if(userInfo['username'] === 'admin'){
        return res.redirect(`${redirectURL}/hub/login`)
    }

    if(userInfo['jupyter'] === '1'){
        // token을 받은 뒤 mdl_user에 jupyter에 저장 한 뒤 서버 시작
        console.log('user의 Token이 존재하지 않습니다.')
        await postAxios('',userInfo['username'],headerToken)
    
        const {data:{token}} = await postAxios('/tokens', userInfo['username'], headerToken , 
                                            {"username" : userInfo['username'] , "password" : "Global!23"})
        
        // 개인서버 token을 DB에 데이터에 저장
        DBresult = await connection.query(Query( 'saveJupyter' , userInfo['username'] , token))

        // 서버가 꺼져있을경우가 있으니 서버를 실행해준다. 
        await postAxios('/server' , userInfo['username'] , userInfo['jupyter'])
        
        // JupeyterHub로 Redirect 해준다.
        return await res.redirect(`${redirectURL}/user/${userInfo['username']}/tree/${course}?token=${userInfo['jupyter']}`)
        
    }
    else{
        console.log('user의 Token이 존재합니다.')
        
        if(course === 'lab'){
            await postAxios('/server' , userInfo['username'] , userInfo['jupyter'])
            console.log(`${redirectURL}/user/${userInfo['username']}/lab?token=${userInfo['jupyter']}`)
            return await res.redirect(`${redirectURL}/user/${userInfo['username']}/lab?token=${userInfo['jupyter']}`)
        }

        // 서버가 꺼져있을경우가 있으니 서버를 실행해준다. 
        await postAxios('/server' , userInfo['username'] , userInfo['jupyter'])
        
        console.log(`${redirectURL}/user/${userInfo['username']}/tree/${course}?token=${userInfo['jupyter']}`)
        // JupeyterHub로 Redirect 해준다.
        return await res.redirect(`${redirectURL}/user/${userInfo['username']}/tree/${course}?token=${userInfo['jupyter']}`)
    }


})


app.listen(jupyterInfo.serverPort , () => {
    console.log(`Test server listen on ${jupyterInfo.serverPort}`)
})