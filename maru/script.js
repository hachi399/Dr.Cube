document.addEventListener('DOMContentLoaded',function(){
  var learnBtn = document.getElementById('learnBtn');
  var form = document.getElementById('contactForm');
  var result = document.getElementById('formResult');
  var resetBtn = document.getElementById('resetBtn');

  if(learnBtn){
    learnBtn.addEventListener('click',function(){
      var target = document.getElementById('features');
      if(target) target.scrollIntoView({behavior:'smooth'});
    });
  }

  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var data = new FormData(form);
      var name = data.get('name') || 'ゲスト';
      result.textContent = name + ' さん、メッセージを受け取りました。ありがとうございます！';
      form.reset();
    });
  }

  if(resetBtn){
    resetBtn.addEventListener('click',function(){
      if(form) form.reset();
      if(result) result.textContent = '';
    });
  }
});
