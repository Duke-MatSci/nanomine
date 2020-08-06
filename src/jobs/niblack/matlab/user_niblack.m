function user_niblack(filename, win0)
path = ''; 
option = 0;
img_path = strcat(path,filename,'.tif');
flag = 0;
win = win0;
while flag==0
    img = imread(img_path);
    img = img (1:1440,1:1440);
    img_blurred = medfilt2(img, [10 10]);
    img_blurred = img_blurred(6:1435, 6:1435);
    img_th = niblack(img_blurred, [win, win], -.2,10);
    img_out = noise_filter(-img_th+1, 60);
    if option == 0
    	figure(1);
    	imshow(img_blurred);
    	figure(2);
    	imshow(img_out);
    else
    	figure(1)
    	imshow(abs(img_blurred-1));
    	figure(2);
    	imshow(abs(img_out-1));
    end
    disp('If the binary image matches with the original image, enter 0;');
    disp('If the binary image does not match the original one, enter the adjustment value:');
    disp('Current Win_size:');
    win
    disp('VF =');
    sum(img_out(:))/1430/1430;
    adjust = input('adjustment value is:');
    if adjust == 0
        flag = 1;
    else
        win = win +adjust;
    end
end
img1 = img_out;
%[img_out, VF] = black_dot(img_out);
save_path = strcat(path,filename,'.mat');
save(save_path,'img_out');

end