function find_combine(L,size, vf)
load('./Large/sample_binary_input_3D_recon.mat')
img1 = img;
load('./Small/sample_binary_input_3D_recon.mat')
img2 = img;


while 1
    u = randi([1,L-size+1],3,1);
    v = randi([1,L-size+1],3,1);
    set1 = img(u(1):u(1)+size-1, u(2):u(2)+size-1, u(3):u(3)+size-1);
    set2 = img(v(1):v(1)+size-1, v(2):v(2)+size-1, v(3):v(3)+size-1);
    Bimg = set1 + set2;
    Bimg = double(Bimg>0);
    Bvf = sum(Bimg(:))/size^3;
    if abs(Bvf-vf)/vf < 0.08
        save('micro.mat','Bimg');
        break;
    else
        disp(Bvf)
    end
    

end